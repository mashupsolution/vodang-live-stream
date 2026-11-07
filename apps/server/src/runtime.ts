import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const APP_DIR = "VoDangOnline";
const LEGACY_APP_DIR = "TuTienOnline";

// Per-user data folder for the packaged app (database, optional .env).
export function appDataDir(
  platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const customHome = env.VODANG_HOME ?? env.TUTIEN_HOME ?? env.TEMPLE_HOME;
  if (customHome) return customHome;
  const base =
    platform === "darwin"
      ? join(homedir(), "Library", "Application Support")
      : platform === "win32"
        ? (env.APPDATA ?? join(homedir(), "AppData", "Roaming"))
        : (env.XDG_DATA_HOME ?? join(homedir(), ".local", "share"));
  const dir = join(base, APP_DIR);
  const legacy = join(base, LEGACY_APP_DIR);
  // Keep using an existing pre-rename data folder.
  return !existsSync(dir) && existsSync(legacy) ? legacy : dir;
}

export function openBrowser(url: string) {
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(command, args, {
      stdio: "ignore",
      detached: true,
      windowsHide: true,
    });
    child.on("error", () => undefined);
    child.unref();
  } catch {
    // The URL is printed, so a missing opener is not fatal.
  }
}
