import * as crypto from "node:crypto";
import * as http from "node:http";
import * as readline from "node:readline/promises";
import { spawn } from "node:child_process";
import type { Command } from "commander";
import {
  DEFAULT_API_URL,
  DEFAULT_WEB_URL,
  deleteConfigFile,
  resolveConfig,
  writeConfigFile,
} from "../config.js";
import { ApiError } from "../api.js";

interface WhoAmI {
  userId: string;
}

function openBrowser(url: string): void {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? "open" : platform === "win32" ? "start" : "xdg-open";
  const args = platform === "win32" ? ["", url] : [url];
  try {
    spawn(cmd, args, { shell: platform === "win32", stdio: "ignore", detached: true }).unref();
  } catch {
    // ブラウザを自動起動できない場合はURLを表示するのみ
  }
}

async function whoAmI(apiUrl: string, apiKey: string): Promise<WhoAmI> {
  const res = await fetch(`${apiUrl}/agent/whoami`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text());
  }
  return (await res.json()) as WhoAmI;
}

async function loginWithKey(
  apiUrl: string,
  apiKey: string,
  json: boolean,
): Promise<void> {
  const who = await whoAmI(apiUrl, apiKey);
  writeConfigFile({ apiUrl, apiKey });
  if (json) {
    console.log(JSON.stringify({ userId: who.userId }, null, 2));
  } else {
    console.log(`${who.userId} としてログインしました`);
  }
}

async function loginManual(
  apiUrl: string,
  json: boolean,
): Promise<void> {
  console.log("設定画面 > API キー で発行したキーを貼り付けてください");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const apiKey = (await rl.question("API Key: ")).trim();
  rl.close();
  await loginWithKey(apiUrl, apiKey, json);
}

async function loginWithBrowser(
  apiUrl: string,
  webUrl: string,
  json: boolean,
): Promise<void> {
  const state = crypto.randomBytes(16).toString("hex");

  const apiKey = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error("ログインがタイムアウトしました(5分)"));
      },
      5 * 60 * 1000,
    );

    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }
      const returnedState = url.searchParams.get("state");
      const key = url.searchParams.get("key");
      if (returnedState !== state || !key) {
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<html><body>認証に失敗しました。state が一致しません。</body></html>");
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", Connection: "close" });
      res.end("<html><body>認証完了。このタブは閉じてOK</body></html>", () => {
        clearTimeout(timeout);
        // keep-alive 接続が残ると close() が完了せずプロセスが終了しないため強制切断
        server.close();
        server.closeAllConnections();
        resolve(key);
      });
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      const authUrl = `${webUrl}/cli-auth?port=${port}&state=${state}`;
      console.log(`ブラウザで認証してください: ${authUrl}`);
      openBrowser(authUrl);
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await loginWithKey(apiUrl, apiKey, json);
}

export function registerAuthCommand(program: Command): void {
  const auth = program.command("auth").description("認証関連コマンド");

  auth
    .command("login")
    .description("ログインしてAPIキーを保存する")
    .option("--manual", "ブラウザ認証を使わず、APIキーを直接貼り付ける")
    .option("--api-url <url>", "API のベースURL", DEFAULT_API_URL)
    .option("--web-url <url>", "Web UI のベースURL", DEFAULT_WEB_URL)
    .option("--json", "JSON形式で出力する")
    .action(async (opts: { manual?: boolean; apiUrl: string; webUrl: string; json?: boolean }) => {
      try {
        if (opts.manual) {
          await loginManual(opts.apiUrl, !!opts.json);
        } else {
          await loginWithBrowser(opts.apiUrl, opts.webUrl, !!opts.json);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  auth
    .command("status")
    .description("ログイン状態を確認する")
    .option("--json", "JSON形式で出力する")
    .action(async (opts: { json?: boolean }) => {
      try {
        const { apiUrl, apiKey } = resolveConfig();
        if (!apiKey) {
          throw new Error("未ログインです。`splisona auth login` を実行してください。");
        }
        const who = await whoAmI(apiUrl!, apiKey);
        if (opts.json) {
          console.log(JSON.stringify(who, null, 2));
        } else {
          console.log(`${who.userId} としてログイン中です`);
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  auth
    .command("logout")
    .description("ログアウトして保存済みの設定を削除する")
    .action(() => {
      const deleted = deleteConfigFile();
      console.log(deleted ? "ログアウトしました" : "ログイン情報は見つかりませんでした");
    });
}
