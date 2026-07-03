import { spawn } from "node:child_process";
import type { Command } from "commander";
import { api } from "../api.js";
import { DEFAULT_WEB_URL } from "../config.js";

const AXES = ["usability", "aesthetics", "clarity", "engagement", "trust"] as const;
type Axis = (typeof AXES)[number];
type Scores = Record<Axis, number>;

interface ReportResponse {
  abTest: unknown;
  summary: {
    winner: "A" | "B" | "tie";
    avgScores: { A: Scores; B: Scores };
    improvementReport?: { title?: string; items?: { title: string }[]; [key: string]: unknown };
    [key: string]: unknown;
  };
  evaluations: { winner: "A" | "B" | "none"; [key: string]: unknown }[];
}

function axisAverage(scores: Scores): number {
  const values = AXES.map((axis) => scores[axis]);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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

function extractImprovementTitles(
  improvementReport: ReportResponse["summary"]["improvementReport"],
): string[] {
  if (!improvementReport) return [];
  if (Array.isArray(improvementReport.items)) {
    return improvementReport.items.map((item) => item.title).filter(Boolean);
  }
  if (typeof improvementReport.title === "string") {
    return [improvementReport.title];
  }
  return [];
}

export function registerReportCommand(program: Command): void {
  const report = program.command("report").description("レポート関連コマンド");

  report
    .command("get")
    .description("テストのレポートを取得する")
    .argument("<testId>", "対象のテストID")
    .option("--json", "JSON形式で出力する")
    .option("--fail-below <n>", "指定スコア未満なら失敗として終了する", parseFloat)
    .option("--axis <axis>", "usability|aesthetics|clarity|engagement|trust")
    .option("--design <design>", "A|B|winner")
    .action(
      async (
        testId: string,
        opts: {
          json?: boolean;
          failBelow?: number;
          axis?: Axis;
          design?: "A" | "B" | "winner";
        },
      ) => {
        try {
          const data = await api.get<ReportResponse>(`/tests/${testId}/report`);
          const { summary, evaluations } = data;

          if (opts.json) {
            console.log(JSON.stringify(data, null, 2));
          } else {
            const winsA = evaluations.filter((e) => e.winner === "A").length;
            const winsB = evaluations.filter((e) => e.winner === "B").length;
            const winnerLabel =
              summary.winner === "tie" ? "引き分け" : `デザイン${summary.winner}`;
            console.log(`勝者: ${winnerLabel} (A支持=${winsA}, B支持=${winsB})`);
            console.log(
              `軸平均A: ${AXES.map((a) => `${a}=${summary.avgScores.A[a].toFixed(1)}`).join(", ")}`,
            );
            console.log(
              `軸平均B: ${AXES.map((a) => `${a}=${summary.avgScores.B[a].toFixed(1)}`).join(", ")}`,
            );
            const titles = extractImprovementTitles(summary.improvementReport);
            if (titles.length > 0) {
              console.log("改善提案:");
              for (const title of titles) {
                console.log(`  - ${title}`);
              }
            }
          }

          if (opts.failBelow !== undefined) {
            const requestedDesign = opts.design === "winner" ? undefined : opts.design;
            const design: "A" | "B" | undefined =
              requestedDesign ?? (summary.winner === "tie" ? undefined : summary.winner);

            let targetScore: number;
            if (design) {
              const scores = summary.avgScores[design];
              targetScore = opts.axis ? scores[opts.axis] : axisAverage(scores);
            } else {
              const avgA = opts.axis
                ? summary.avgScores.A[opts.axis]
                : axisAverage(summary.avgScores.A);
              const avgB = opts.axis
                ? summary.avgScores.B[opts.axis]
                : axisAverage(summary.avgScores.B);
              targetScore = (avgA + avgB) / 2;
            }

            if (targetScore < opts.failBelow) {
              console.error(
                `スコア ${targetScore.toFixed(1)} が閾値 ${opts.failBelow} を下回っています`,
              );
              process.exit(1);
            }
          }
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      },
    );

  report
    .command("open")
    .description("ブラウザでレポートページを開く")
    .argument("<testId>", "対象のテストID")
    .option("--web-url <url>", "Web UI のベースURL", DEFAULT_WEB_URL)
    .action((testId: string, opts: { webUrl: string }) => {
      const url = `${opts.webUrl}/tests/${testId}/report`;
      console.log(url);
      openBrowser(url);
    });
}
