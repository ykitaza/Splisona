import { HelpDot } from './HelpDot';

export function MethodPopover() {
  return (
    <HelpDot
      title="評価手法"
      content="各ペルソナが AI としてデザイン A/B を比較し、5 軸（使いやすさ・見た目・分かりやすさ・行動喚起・信頼感）で 0〜100 のスコアを付けます。過半数の支持を得た案を勝者とします。"
    />
  );
}

export function SourcePopover() {
  return (
    <HelpDot
      title="データソース"
      content="スコアは Amazon Bedrock 上の LLM がペルソナの属性・性格に基づいて生成したものです。実際のユーザーテストとは異なります。"
    />
  );
}

export function AttributePopover() {
  return (
    <HelpDot
      title="属性別分析"
      content="ペルソナのタイプ・性別・年齢層ごとに、各評価軸の A 案勝率を集計したヒートマップです。属性による評価傾向の違いを視覚化します。"
    />
  );
}
