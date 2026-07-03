import type { ReportResponse } from '@/features/report/types';
import type { Persona } from '@/features/persona/types';

export interface ExportPayload {
  report: ReportResponse;
  personas: Persona[];
  modelId: string;
  imageA: string | null;
  imageB: string | null;
  exportedAt: string;
}
