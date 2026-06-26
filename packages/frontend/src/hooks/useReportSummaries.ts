import { useEffect, useState } from 'react';
import { getReport } from '../api/tests';
import type { ReportSummary } from '../types';

export function useReportSummaries(testIds: string[]): Record<string, ReportSummary> {
  const [summaries, setSummaries] = useState<Record<string, ReportSummary>>({});

  useEffect(() => {
    if (testIds.length === 0) return;
    Promise.all(
      testIds.map((id) =>
        getReport(id)
          .then((r) => ({ id, summary: r.summary }))
          .catch(() => null)
      )
    ).then((results) => {
      const map: Record<string, ReportSummary> = {};
      for (const r of results) {
        if (r) map[r.id] = r.summary;
      }
      setSummaries(map);
    });
  }, [testIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return summaries;
}
