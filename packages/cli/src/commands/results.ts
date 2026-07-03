import * as fs from "node:fs";
import type { Command } from "commander";
import { api } from "../api.js";

interface Evaluation {
  personaId: string;
  winner: "A" | "B" | "none";
  confidence: number;
  reason: string;
  scoresA: Record<string, number>;
  scoresB: Record<string, number>;
  resolvedPrompt?: string;
}

interface ResultsPayload {
  model: string;
  evaluations: Evaluation[];
  reasonSummary?: unknown;
  improvementReport?: unknown;
}

export function registerResultsCommand(program: Command): void {
  const results = program.command("results").description("評価結果関連コマンド");

  results
    .command("push")
    .description("評価結果ファイルをテストに送信する")
    .argument("<testId>", "対象のテストID")
    .argument("<resultsFile>", "評価結果のJSONファイルパス")
    .option("--json", "JSON形式で出力する")
    .action(async (testId: string, resultsFile: string, opts: { json?: boolean }) => {
      try {
        const raw = fs.readFileSync(resultsFile, "utf-8");
        const payload = JSON.parse(raw) as ResultsPayload;

        const response = await api.post(`/tests/${testId}/results`, payload);

        if (opts.json) {
          console.log(JSON.stringify(response, null, 2));
          return;
        }

        const winsA = payload.evaluations.filter((e) => e.winner === "A").length;
        const winsB = payload.evaluations.filter((e) => e.winner === "B").length;
        const none = payload.evaluations.filter((e) => e.winner === "none").length;
        console.log(`結果を送信しました: ${testId}`);
        console.log(
          `評価数=${payload.evaluations.length} (A=${winsA}, B=${winsB}, none=${none})`,
        );
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    });
}
