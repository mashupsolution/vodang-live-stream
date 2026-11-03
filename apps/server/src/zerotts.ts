import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  zeroTtsVoices,
  type NarratorVoice,
} from "../../../packages/shared/src/index.ts";
import type { NarrationProvider, NarrationStatus } from "./narrator.ts";

const defaultZeroVoice = "maichi";
const voiceLabels: Record<string, string> = {
  maichi: "Mai Chi",
  baotrang: "Bảo Trang",
  giahuy: "Gia Huy",
  hamy: "Hà My",
  huuduc: "Hữu Đức",
  kimoanh: "Kim Oanh",
  quangminh: "Quang Minh",
  tiendat: "Tiến Đạt",
};

export type ZeroTtsOptions = {
  python?: string;
  script?: string;
  dataDir?: string;
  modelPath?: string;
  env?: NodeJS.ProcessEnv;
};

type WorkerMessage = {
  type?: string;
  id?: number | null;
  ok?: boolean;
  file?: string;
  error?: string;
  status?: string;
  voices?: string[];
};

type Waiter = {
  resolve: (file: string) => void;
  reject: (error: Error) => void;
};

const here = dirname(fileURLToPath(import.meta.url));

export function zeroTtsVoiceId(voice: NarratorVoice): string {
  const id = voice.startsWith("zerotts-") ? voice.slice(8) : defaultZeroVoice;
  return id in voiceLabels ? id : defaultZeroVoice;
}

/** ZeroTTS is chosen only when a local model or an explicit Python is configured. */
export function zeroTtsConfigured(env: NodeJS.ProcessEnv = process.env) {
  if (env.ZEROTTS === "0") return false;
  if (env.ZEROTTS_PYTHON || env.ZEROTTS_MODEL_PATH) return true;
  const dataDir = env.ZEROTTS_DATA_DIR || join(process.cwd(), "data");
  return existsSync(join(dataDir, "zerotts-model", "config.json"));
}

export function createZeroTtsProvider(
  options: ZeroTtsOptions = {},
): NarrationProvider & { warm(): void; close(): void } {
  const env = options.env ?? process.env;
  const dataDir = resolve(
    options.dataDir ?? env.ZEROTTS_DATA_DIR ?? join(process.cwd(), "data"),
  );
  const cacheDir = join(dataDir, "tts-cache");
  const script = options.script ?? join(here, "..", "tts", "zerotts_worker.py");
  const venvPython = join(process.cwd(), ".venv", "bin", "python");
  const python =
    options.python ??
    env.ZEROTTS_PYTHON ??
    (existsSync(venvPython) ? venvPython : "python3");

  let worker: ChildProcessWithoutNullStreams | undefined;
  let ready: Promise<void> | undefined;
  let state: "idle" | "loading" | "ready" | "failed" = "idle";
  let lastError = "";
  let nextId = 1;
  const waiters = new Map<number, Waiter>();

  function fail(error: Error) {
    state = "failed";
    lastError = error.message;
    for (const waiter of waiters.values()) waiter.reject(error);
    waiters.clear();
  }

  function start(): Promise<void> {
    if (ready) return ready;
    state = "loading";
    ready = new Promise<void>((resolveReady, rejectReady) => {
      const childEnv: NodeJS.ProcessEnv = {
        ...env,
        ZEROTTS_DATA_DIR: dataDir,
        ZEROTTS_CACHE_DIR: cacheDir,
        PYTHONUNBUFFERED: "1",
      };
      if (options.modelPath) childEnv.ZEROTTS_MODEL_PATH = options.modelPath;
      const child = spawn(python, [script], {
        env: childEnv,
        stdio: ["pipe", "pipe", "pipe"],
      });
      worker = child;
      let buffer = "";
      let settled = false;
      const settle = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (error) rejectReady(error);
        else resolveReady();
      };
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        buffer += chunk;
        let index: number;
        while ((index = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          if (!line) continue;
          let message: WorkerMessage;
          try {
            message = JSON.parse(line);
          } catch {
            continue;
          }
          if (message.type === "ready") {
            state = "ready";
            lastError = "";
            settle();
          } else if (message.type === "error") {
            const error = new Error(message.error || "zerotts-load-failed");
            settle(error);
            fail(error);
          } else if (message.type === "result" && message.id != null) {
            const waiter = waiters.get(message.id);
            if (!waiter) continue;
            waiters.delete(message.id);
            if (message.ok && message.file) waiter.resolve(message.file);
            else waiter.reject(new Error(message.error || "zerotts-failed"));
          }
        }
      });
      child.stderr.resume();
      child.on("error", (error) => {
        settle(error);
        fail(error);
        worker = undefined;
        ready = undefined;
      });
      child.on("exit", (code) => {
        const error = new Error(`zerotts-worker-exit-${code}`);
        settle(error);
        if (state !== "failed") fail(error);
        worker = undefined;
        ready = undefined; // next request restarts the worker
      });
    });
    ready.catch(() => {});
    return ready;
  }

  return {
    contentType: "audio/wav",
    timeoutMs: 45000,
    effectiveVoice: (voice) => zeroTtsVoiceId(voice),
    warm() {
      void start();
    },
    close() {
      worker?.kill();
    },
    async status(voice): Promise<NarrationStatus> {
      void start();
      const id = zeroTtsVoiceId(voice);
      const name = voiceLabels[id];
      const detail =
        state === "ready"
          ? `Giọng ZeroTTS ${name} sẵn sàng (chạy cục bộ, không cần Internet).`
          : state === "failed"
            ? `ZeroTTS gặp lỗi: ${lastError}. Kiểm tra Python, gói zerotts và model; sẽ thử lại khi có lời đọc mới.`
            : "ZeroTTS đang nạp model…";
      return {
        available: state !== "failed",
        voice: id,
        provider: "zerotts",
        detail,
      };
    },
    async synthesize(text, voice, signal) {
      if (signal.aborted) throw new Error("aborted");
      await start();
      const child = worker;
      if (!child) throw new Error("zerotts-unavailable");
      const id = nextId++;
      const file = await new Promise<string>((resolveFile, rejectFile) => {
        const onAbort = () => {
          waiters.delete(id);
          rejectFile(new Error("aborted"));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        waiters.set(id, {
          resolve: (name) => {
            signal.removeEventListener("abort", onAbort);
            resolveFile(name);
          },
          reject: (error) => {
            signal.removeEventListener("abort", onAbort);
            rejectFile(error);
          },
        });
        child.stdin.write(
          JSON.stringify({ cmd: "synth", id, text, voice }) + "\n",
          (error) => {
            if (!error) return;
            waiters.delete(id);
            signal.removeEventListener("abort", onAbort);
            rejectFile(error);
          },
        );
      });
      if (!/^[\w.-]+\.wav$/.test(file)) throw new Error("zerotts-bad-file");
      return await readFile(join(cacheDir, file));
    },
  };
}

export { zeroTtsVoices, voiceLabels as zeroTtsVoiceLabels };
