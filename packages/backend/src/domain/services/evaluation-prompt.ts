import { personaTypeLabel } from "../types.js";

export interface EvalPromptPersona {
  displayName: string;
  type: string;
  age?: number;
  gender?: string;
  occupation?: string;
  annualIncome?: number;
  education?: string;
  deviationScore?: number;
  freeText?: string;
}

export interface EvalPromptInput {
  persona: EvalPromptPersona;
  projectContext?: string;
  focusPoints?: string;
  additionalInstruction?: string;
  /** プロバイダごとの評価指示行（tool use の有無で文言が異なる） */
  evaluateInstruction: string;
}

/**
 * 評価プロンプトを組み立てる。全 AI プロバイダで共通・
 * レポートの「解決済みプロンプト」表示にもこの出力をそのまま保存する。
 */
export function buildEvaluationPrompt(input: EvalPromptInput): string {
  const p = input.persona;
  const profile = [
    p.age != null ? `${p.age}歳` : null,
    p.gender || null,
    p.annualIncome != null ? `年収${p.annualIncome}万円` : null,
    p.education || null,
    p.deviationScore != null ? `偏差値${p.deviationScore}` : null,
  ].filter(Boolean).join(" / ");

  return [
    `あなたは「${p.displayName}」というペルソナです。`,
    `タイプ: ${personaTypeLabel(p.type)}`,
    profile ? `属性: ${profile}` : null,
    p.occupation ? `職業: ${p.occupation}` : null,
    p.freeText ? `詳細: ${p.freeText}` : null,
    input.projectContext ? `\nデザインの背景:\n${input.projectContext}` : null,
    "",
    "最初の画像がデザインA、次の画像がデザインBです。",
    input.evaluateInstruction,
    "scoresA と scoresB に、A案・B案それぞれの各軸スコア（0〜100）を採点してください。reason は必ず日本語で記述してください。",
    input.focusPoints ? `\n注目ポイント:\n${input.focusPoints}` : null,
    input.additionalInstruction ? `\n追加指示:\n${input.additionalInstruction}` : null,
  ].filter((l) => l !== null).join("\n");
}
