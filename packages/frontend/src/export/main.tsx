import '@/index.css';
import { createRoot } from 'react-dom/client';
import { ReportExportView } from './ReportExportView';
import type { ExportPayload } from './types';

declare global {
  interface Window {
    __SPLISONA_REPORT__?: ExportPayload;
  }
}

const data = window.__SPLISONA_REPORT__;
if (data) {
  const root = createRoot(document.getElementById('root')!);
  root.render(<ReportExportView data={data} />);
} else {
  document.body.innerHTML = '<p style="color:#888;text-align:center;padding:48px">レポートデータが見つかりません</p>';
}
