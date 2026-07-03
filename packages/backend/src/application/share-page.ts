import type { AppContainer } from "../container.js";

export interface ShareImages {
  imageA: string | null;
  imageB: string | null;
}

export async function buildSharePayload(
  container: AppContainer,
  userId: string,
  testId: string,
  images: ShareImages,
): Promise<object> {
  const report = await container.reportUseCases.getReport(userId, testId);

  // 内部のペルソナ定義を含むため、公開ページからは必ず除去する
  const evaluations = report.evaluations.map((e) => {
    const { resolvedPrompt: _resolvedPrompt, ...rest } = e;
    return rest;
  });

  const allPersonas = await container.personaUseCases.list(userId);
  const personaIds = new Set(report.abTest.personaIds);
  const personas = allPersonas
    .filter((p) => personaIds.has(p.personaId))
    .map(({ userId: _userId, ...rest }) => rest);

  // 所有者のメールアドレス（userId）と画像キー（アカウント識別子を含むパス）も公開ページには出さない
  const { userId: _ownerUserId, ...abTestRest } = report.abTest as { userId?: string } & Record<string, unknown>;
  const scrub = (input: unknown) => {
    if (!input || typeof input !== "object") return input;
    const { imageKey: _ik, segmentKeys: _sk, ...rest } = input as Record<string, unknown>;
    return rest;
  };
  const abTest = {
    ...abTestRest,
    designAInput: scrub(abTestRest.designAInput),
    designBInput: scrub(abTestRest.designBInput),
  };

  return {
    report: { ...report, abTest, evaluations },
    personas,
    modelId: container.modelId,
    imageA: images.imageA,
    imageB: images.imageB,
    exportedAt: new Date().toISOString(),
  };
}

export function buildShareHtml(template: string, payload: object): string {
  const dataScript = `<script>window.__SPLISONA_REPORT__=${JSON.stringify(payload).replace(/</g, "\\u003c")};<\/script>`;
  const withData = template.replace('<div id="root"></div>', `${dataScript}\n<div id="root"></div>`);
  return withData.replace("</head>", '  <meta name="robots" content="noindex,nofollow">\n</head>');
}
