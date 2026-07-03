import { API_BASE } from '@/shared/api/client';
import type { ReportResponse } from './types';
import type { Persona } from '@/features/persona/types';
import type { ExportPayload } from '@/export/types';

async function fetchImageAsDataUrl(imageKey: string | undefined): Promise<string | null> {
  if (!imageKey) return null;
  try {
    const res = await fetch(`${API_BASE}/images/${imageKey}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const base64 = btoa(binary);
    const mime = blob.type || 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

// --- JSON Export ---

export function buildExportJson(report: ReportResponse, personas: Persona[], modelId: string): string {
  const { abTest, summary, evaluations } = report;
  const payload = {
    meta: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      generator: 'Splisona',
      modelId: modelId || null,
    },
    test: {
      testId: abTest.testId,
      title: abTest.title,
      status: abTest.status,
      designA: abTest.designAInput,
      designB: abTest.designBInput,
      personaIds: abTest.personaIds,
      focusPoints: abTest.focusPoints ?? null,
      createdAt: abTest.createdAt,
      updatedAt: abTest.updatedAt,
    },
    personas: personas
      .filter((p) => abTest.personaIds.includes(p.personaId))
      .map((p) => ({
        personaId: p.personaId,
        displayName: p.displayName,
        type: p.type,
        source: p.source ?? null,
        age: p.age ?? null,
        gender: p.gender ?? null,
        occupation: p.occupation ?? null,
        avatarImageKey: p.avatarImageKey ?? null,
      })),
    summary: {
      winner: summary.winner,
      supportRateA: summary.supportRateA,
      supportRateB: summary.supportRateB,
      supportRateNone: summary.supportRateNone,
      totalPersonas: summary.totalPersonas,
      completedPersonas: summary.completedPersonas,
      avgScores: summary.avgScores,
      winnersReasonSummary: summary.winnersReasonSummary,
      reasonSummaryA: summary.reasonSummaryA,
      reasonSummaryB: summary.reasonSummaryB,
    },
    evaluations: evaluations
      .filter((e) => e.status === 'completed')
      .map((e) => ({
        personaId: e.personaId,
        personaDisplayName: e.personaDisplayName,
        winner: e.winner,
        confidence: e.confidence,
        reason: e.reason,
        scoresA: e.scoresA,
        scoresB: e.scoresB,
        prompt: [
          `ペルソナ「${e.personaDisplayName}」として、デザイン A と B を比較し、5軸で評価してください。`,
          abTest.focusPoints ? `注目ポイント:\n${abTest.focusPoints}` : null,
        ].filter(Boolean).join('\n'),
      })),
  };
  return JSON.stringify(payload, null, 2);
}

// --- HTML Export (React-embedded single file) ---

export async function buildExportHtml(report: ReportResponse, personas: Persona[], modelId: string): Promise<string> {
  const { abTest } = report;

  const [imageA, imageB, templateRes] = await Promise.all([
    fetchImageAsDataUrl(abTest.designAInput.imageKey),
    fetchImageAsDataUrl(abTest.designBInput.imageKey),
    fetch(`${location.origin}/export-template.html`),
  ]);

  const template = await templateRes.text();

  const payload: ExportPayload = {
    report,
    personas,
    modelId,
    imageA,
    imageB,
    exportedAt: new Date().toISOString(),
  };

  const dataScript = `<script>window.__SPLISONA_REPORT__=${JSON.stringify(payload).replace(/</g, '\\u003c')};<\/script>`;
  return template.replace('<div id="root"></div>', `${dataScript}\n<div id="root"></div>`);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
