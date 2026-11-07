import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import type {
  Announcement,
  NarratorVoice,
} from "../../../packages/shared/src/index.ts";
import { createZeroTtsProvider, zeroTtsConfigured } from "./zerotts.ts";

const execute = promisify(execFile);
const defaultVoice: NarratorVoice = "vi-VN-NamMinhNeural";
export type NarrationAudio = {
  bytes: Buffer;
  contentType: "audio/wav" | "audio/mpeg";
};
export type NarrationStatus = {
  available: boolean;
  voice: string;
  detail: string;
  provider: "native" | "edge" | "zerotts" | "unavailable";
};
export interface NarrationProvider {
  readonly contentType: NarrationAudio["contentType"];
  readonly timeoutMs?: number;
  warm?(): void;
  close?(): void;
  effectiveVoice(voice: NarratorVoice): string;
  status(voice: NarratorVoice): Promise<NarrationStatus>;
  synthesize(text: string, voice: string, signal: AbortSignal): Promise<Buffer>;
}

let nativeVoiceAvailableUntil = 0;
const nativeProvider: NarrationProvider = {
  contentType: "audio/wav",
  effectiveVoice: () => "Linh",
  async status() {
    try {
      let available = Date.now() < nativeVoiceAvailableUntil;
      if (!available) {
        const { stdout } = await execute("/usr/bin/say", ["-v", "?"], {
          timeout: 5000,
        });
        available = /^Linh\s/m.test(stdout);
        if (available) nativeVoiceAvailableUntil = Date.now() + 60000;
      }
      return {
        available,
        voice: "Linh",
        provider: "native",
        detail: available
          ? "Giọng Linh sẵn sàng."
          : "Giọng Linh không khả dụng trên máy này.",
      };
    } catch {
      return {
        available: false,
        voice: "Linh",
        provider: "native",
        detail: "Giọng Linh không khả dụng trên máy này.",
      };
    }
  },
  async synthesize(text, _voice, signal) {
    const dir = await mkdtemp(join(tmpdir(), "vodang-voice-"));
    try {
      const path = join(dir, "voice.wav");
      await execute(
        "/usr/bin/say",
        [
          "-v",
          "Linh",
          "-r",
          "165",
          "-o",
          path,
          "--data-format=LEI16@22050",
          text,
        ],
        { timeout: 15000, signal },
      );
      return await readFile(path);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
};

export function createEdgeProvider(
  createClient: () => Pick<
    MsEdgeTTS,
    "setMetadata" | "toStream" | "close"
  > = () => new MsEdgeTTS(),
): NarrationProvider {
  return {
    contentType: "audio/mpeg",
    effectiveVoice: (voice) => voice,
    async status(voice) {
      return {
        available: true,
        voice,
        provider: "edge",
        detail: "Giọng Edge đã cấu hình; cần kết nối Internet để đọc.",
      };
    },
    async synthesize(text, voice, signal) {
      for (let attempt = 0; ; attempt++) {
        try {
          return await synthesizeOnce(text, voice, signal);
        } catch (error) {
          if (
            signal.aborted ||
            attempt >= 2 ||
            !(error instanceof Error) ||
            !error.message.includes(
              "Stream closed before the synthesis completed",
            )
          )
            throw error;
          await delay(150, undefined, { signal });
        }
      }
    },
  };

  async function synthesizeOnce(
    text: string,
    voice: string,
    signal: AbortSignal,
  ): Promise<Buffer> {
    const tts = createClient();
    const abort = () => {
      try {
        tts.close();
      } catch {}
    };
    signal.addEventListener("abort", abort, { once: true });
    try {
      if (signal.aborted) throw new Error("aborted");
      await tts.setMetadata(
        voice,
        OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
      );
      if (signal.aborted) throw new Error("aborted");
      const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
      const { audioStream } = tts.toStream(escaped);
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of audioStream) {
        if (signal.aborted) throw new Error("aborted");
        const bytes = Buffer.from(chunk);
        size += bytes.length;
        if (size > 4 * 1024 * 1024) throw new Error("audio-too-large");
        chunks.push(bytes);
      }
      if (!size) throw new Error("empty-audio");
      return Buffer.concat(chunks, size);
    } finally {
      signal.removeEventListener("abort", abort);
      abort();
    }
  }
}

const unavailableProvider: NarrationProvider = {
  contentType: "audio/wav",
  effectiveVoice: () => "Linh",
  async status() {
    return {
      available: false,
      voice: "Linh",
      provider: "unavailable",
      detail: "Giọng đọc không khả dụng trên hệ điều hành này.",
    };
  },
  async synthesize() {
    throw new Error("unavailable");
  },
};

function defaultProvider(): NarrationProvider {
  if (zeroTtsConfigured()) return createZeroTtsProvider();
  return process.platform === "darwin"
    ? nativeProvider
    : process.platform === "win32"
      ? createEdgeProvider()
      : unavailableProvider;
}

export class Narrator {
  private cache = new Map<string, NarrationAudio>();
  private pending = new Map<
    string,
    {
      promise: Promise<NarrationAudio>;
      controller: AbortController;
      interested: number;
    }
  >();
  private failedVoices = new Set<string>();
  private tail: Promise<void> = Promise.resolve();
  private controller = new AbortController();
  private closed = false;
  private timeoutMs: number;
  constructor(
    private provider: NarrationProvider = defaultProvider(),
    timeoutMs?: number,
  ) {
    this.timeoutMs = timeoutMs ?? provider.timeoutMs ?? 15000;
    provider.warm?.();
  }
  get contentType() {
    return this.provider.contentType;
  }
  async status(voice: NarratorVoice = defaultVoice): Promise<NarrationStatus> {
    const status = await this.provider
      .status(voice)
      .catch((): NarrationStatus => ({
        available: false,
        voice: this.provider.effectiveVoice(voice),
        provider: "unavailable",
        detail: "Giọng đọc chưa khả dụng.",
      }));
    const detail = this.failedVoices.has(this.provider.effectiveVoice(voice))
      ? status.provider === "edge"
        ? "Lần đọc gần nhất thất bại. Kiểm tra kết nối Internet; hệ thống sẽ thử lại khi có lời đọc mới."
        : "Lần đọc gần nhất thất bại. Kiểm tra giọng Linh; hệ thống sẽ thử lại khi có lời đọc mới."
      : status.detail;
    return { ...status, detail, available: !this.closed && status.available };
  }
  async audio(
    announcement: Announcement,
    voice: NarratorVoice = defaultVoice,
    signal?: AbortSignal,
  ): Promise<NarrationAudio> {
    if (this.closed) throw new Error("unavailable");
    if (signal?.aborted) throw new Error("aborted");
    const effectiveVoice = this.provider.effectiveVoice(voice);
    const key = `${effectiveVoice}:${announcement.id}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    let job = this.pending.get(key);
    if (!job) {
      if (this.pending.size >= 12) throw new Error("queue-full");
      const jobController = new AbortController();
      const promise = this.tail.then(async () => {
        if (this.closed || jobController.signal.aborted)
          throw new Error("aborted");
        const controller = new AbortController();
        const abort = () => controller.abort();
        this.controller.signal.addEventListener("abort", abort, { once: true });
        jobController.signal.addEventListener("abort", abort, { once: true });
        let timer: ReturnType<typeof setTimeout> | undefined;
        let rejectOnAbort: (() => void) | undefined;
        try {
          const timeout = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              reject(new Error("synthesis-timeout"));
              controller.abort();
            }, this.timeoutMs);
            rejectOnAbort = () => reject(new Error("aborted"));
            controller.signal.addEventListener("abort", rejectOnAbort, {
              once: true,
            });
          });
          const bytes = await Promise.race([
            this.provider.synthesize(
              announcement.text,
              effectiveVoice,
              controller.signal,
            ),
            timeout,
          ]);
          if (this.closed || jobController.signal.aborted)
            throw new Error("aborted");
          this.failedVoices.delete(effectiveVoice);
          const result: NarrationAudio = {
            bytes,
            contentType: this.provider.contentType,
          };
          this.cache.set(key, result);
          if (this.cache.size > 32)
            this.cache.delete(this.cache.keys().next().value!);
          return result;
        } catch (error) {
          if (!this.closed && !jobController.signal.aborted)
            this.failedVoices.add(effectiveVoice);
          throw error;
        } finally {
          if (timer) clearTimeout(timer);
          if (rejectOnAbort)
            controller.signal.removeEventListener("abort", rejectOnAbort);
          this.controller.signal.removeEventListener("abort", abort);
          jobController.signal.removeEventListener("abort", abort);
        }
      });
      this.tail = promise.then(
        () => {},
        () => {},
      );
      job = { promise, controller: jobController, interested: 0 };
      this.pending.set(key, job);
      const current = job;
      void promise.then(
        () => {
          if (this.pending.get(key) === current) this.pending.delete(key);
        },
        () => {
          if (this.pending.get(key) === current) this.pending.delete(key);
        },
      );
    }
    const current = job;
    current.interested++;
    return new Promise<NarrationAudio>((resolve, reject) => {
      let done = false;
      const finish = () => {
        if (done) return false;
        done = true;
        signal?.removeEventListener("abort", cancelled);
        current.interested--;
        return true;
      };
      const cancelled = () => {
        if (!finish()) return;
        if (current.interested === 0) {
          if (this.pending.get(key) === current) this.pending.delete(key);
          current.controller.abort();
        }
        reject(new Error("aborted"));
      };
      signal?.addEventListener("abort", cancelled, { once: true });
      current.promise.then(
        (audio) => {
          if (finish()) resolve(audio);
        },
        (error) => {
          if (finish()) reject(error);
        },
      );
    });
  }
  async close() {
    this.closed = true;
    this.controller.abort();
    await this.tail;
    this.cache.clear();
    this.provider.close?.();
  }
}
