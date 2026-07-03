import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";
import { api, uploadImage } from "../api.js";
import { fetchPersonas } from "./personas.js";

interface CreateTestResponse {
  testId: string;
  [key: string]: unknown;
}

interface UploadUrlResponse {
  uploadUrl: string;
  imageKey: string;
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function contentTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext];
  if (!contentType) {
    throw new Error(
      `未対応の拡張子です: ${ext} (対応: .png, .jpg, .jpeg, .webp)`,
    );
  }
  return contentType;
}

async function uploadSide(
  testId: string,
  side: "A" | "B",
  filePath: string,
): Promise<string> {
  const contentType = contentTypeForFile(filePath);
  const { uploadUrl, imageKey } = await api.post<UploadUrlResponse>(
    `/tests/${testId}/upload-url`,
    { side, contentType },
  );
  const data = fs.readFileSync(filePath);
  await uploadImage(uploadUrl, imageKey, contentType, data);
  return imageKey;
}

export function registerTestCommand(program: Command): void {
  const test = program.command("test").description("A/Bテスト関連コマンド");

  test
    .command("run <testId>")
    .description("サーバー側（リモートLLM）で評価を実行する")
    .option("--json", "JSON形式で出力する")
    .action(async (testId: string, opts: { json?: boolean }) => {
      try {
        const res = await api.post<{ started: boolean }>(`/tests/${testId}/execute`);
        if (opts.json) console.log(JSON.stringify(res, null, 2));
        else console.log(`サーバー側で評価を開始しました: ${testId}\n進捗と結果: splisona report open ${testId}`);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });

  test
    .command("create")
    .description("A/Bテストを作成し、画像をアップロードする")
    .requiredOption("--title <title>", "テストのタイトル")
    .requiredOption("-A <path>", "デザインAの画像パス")
    .requiredOption("-B <path>", "デザインBの画像パス")
    .option("--personas <ids>", "対象ペルソナIDのカンマ区切り (省略時は全件)")
    .option("--focus <text>", "着目してほしいポイント")
    .option("--json", "JSON形式で出力する")
    .action(
      async (opts: {
        title: string;
        A: string;
        B: string;
        personas?: string;
        focus?: string;
        json?: boolean;
      }) => {
        try {
          const personaIds = opts.personas
            ? opts.personas.split(",").map((s) => s.trim()).filter(Boolean)
            : (await fetchPersonas()).map((p) => p.personaId);

          const created = await api.post<CreateTestResponse>("/tests", {
            title: opts.title,
            designAInput: { inputType: "image_upload" },
            designBInput: { inputType: "image_upload" },
            personaIds,
            ...(opts.focus ? { focusPoints: opts.focus } : {}),
          });
          const testId = created.testId;

          const imageKeyA = await uploadSide(testId, "A", opts.A);
          const imageKeyB = await uploadSide(testId, "B", opts.B);

          await api.put(`/tests/${testId}`, {
            designAInput: { inputType: "image_upload", imageKey: imageKeyA },
            designBInput: { inputType: "image_upload", imageKey: imageKeyB },
            personaIds,
            ...(opts.focus ? { focusPoints: opts.focus } : {}),
          });

          if (opts.json) {
            console.log(JSON.stringify({ testId }, null, 2));
          } else {
            console.log(`テストを作成しました: ${testId}`);
          }
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );
}
