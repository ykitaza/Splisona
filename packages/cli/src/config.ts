import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { DEFAULT_API_ORIGIN } from "@chorus/shared";

export const DEFAULT_API_URL = DEFAULT_API_ORIGIN;
export const DEFAULT_WEB_URL = "https://splisona.pages.dev";

const CONFIG_DIR = path.join(os.homedir(), ".splisona");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface CliConfig {
  apiUrl: string;
  apiKey: string;
}

export function readConfigFile(): CliConfig | undefined {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as CliConfig;
  } catch {
    return undefined;
  }
}

export function writeConfigFile(config: CliConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), {
    mode: 0o600,
  });
}

export function deleteConfigFile(): boolean {
  try {
    fs.unlinkSync(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

/** Resolves effective apiUrl/apiKey: env vars take priority over the config file. */
export function resolveConfig(): Partial<CliConfig> {
  const fileConfig = readConfigFile();
  const apiUrl =
    process.env.SPLISONA_API_URL ?? fileConfig?.apiUrl ?? DEFAULT_API_URL;
  const apiKey = process.env.SPLISONA_API_KEY ?? fileConfig?.apiKey;
  return { apiUrl, apiKey };
}
