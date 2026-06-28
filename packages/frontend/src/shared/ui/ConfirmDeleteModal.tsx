import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
  count?: number;
  title?: string;
  message?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDeleteModal({ count, title, message, isDeleting, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, isDeleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => { if (!isDeleting) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col gap-5 bg-surface border border-hairline rounded-lg p-7"
        style={{ width: 420, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-danger-dim">
          <Trash2 size={22} className="text-danger" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-text-hi font-sans text-lg font-semibold">
            {title ?? 'テストを削除しますか？'}
          </h2>
          <p className="text-text-mid font-sans text-sm leading-relaxed">
            {message ?? `選択した ${count} 件のテストとレビュー結果がすべて削除されます。この操作は取り消せません。`}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-md border border-hairline bg-surface text-text-mid font-sans text-sm font-medium transition-colors hover:bg-raised disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-danger text-white font-sans text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Trash2 size={14} />
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
