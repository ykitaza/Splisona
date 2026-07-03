import { describe, it, expect } from "vitest";
import { buildEvaluationPrompt } from "./evaluation-prompt.js";

function basePersona() {
  return {
    displayName: "タクミ",
    type: "action_oriented",
  };
}

describe("buildEvaluationPrompt", () => {
  it("uses the plain single-image instruction when segmentation is omitted", () => {
    const prompt = buildEvaluationPrompt({
      persona: basePersona(),
      evaluateInstruction: "評価してください。",
    });

    expect(prompt).toContain("最初の画像がデザインA、次の画像がデザインBです。");
    expect(prompt).not.toContain("分割したもの");
  });

  it("uses the plain single-image instruction when both counts are 1", () => {
    const prompt = buildEvaluationPrompt({
      persona: basePersona(),
      evaluateInstruction: "評価してください。",
      segmentation: { countA: 1, countB: 1, overlapPx: 150 },
    });

    expect(prompt).toContain("最初の画像がデザインA、次の画像がデザインBです。");
    expect(prompt).not.toContain("分割したもの");
  });

  it("describes the segmentation layout when either side has more than one image", () => {
    const prompt = buildEvaluationPrompt({
      persona: basePersona(),
      evaluateInstruction: "評価してください。",
      segmentation: { countA: 2, countB: 2, overlapPx: 150 },
    });

    expect(prompt).not.toContain("最初の画像がデザインA、次の画像がデザインBです。");
    expect(prompt).toContain("デザインAは1枚の縦長ページを上から順に2分割したもの（画像1〜2）");
    expect(prompt).toContain("デザインBは2分割したもの（画像3〜4）");
    expect(prompt).toContain("約150px重複しています");
    expect(prompt).toContain("画像1と画像3はそれぞれのファーストビューに相当します");
  });

  it("handles an asymmetric split (e.g. A has 1 image, B has 3)", () => {
    const prompt = buildEvaluationPrompt({
      persona: basePersona(),
      evaluateInstruction: "評価してください。",
      segmentation: { countA: 1, countB: 3, overlapPx: 150 },
    });

    expect(prompt).toContain("デザインAは1枚の縦長ページを上から順に1分割したもの（画像1〜1）");
    expect(prompt).toContain("デザインBは3分割したもの（画像2〜4）");
    expect(prompt).toContain("画像1と画像2はそれぞれのファーストビューに相当します");
  });
});
