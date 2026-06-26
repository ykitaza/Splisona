import { useEffect } from 'react';
import { Trash2 } from 'lucide-react';

type Props = {
  /** 削除対象の件数 */
  count: number;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** テスト削除の確認ダイアログ（デザイン: chorus.pen S5a-confirm） */
export function ConfirmDeleteModal({ count, isDeleting, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, isDeleting]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: 'rgba(10, 10, 10, 0.45)', zIndex: 50 }}
      onClick={() => { if (!isDeleting) onCancel(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          gap: 20,
          padding: 28,
          background: '#FFFFFF',
          borderRadius: 10,
          border: '1px solid #E6E6E8',
          boxShadow: '0 16px 48px rgba(10, 10, 10, 0.25)',
        }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 48, height: 48, borderRadius: 9999, background: '#FDEAEA' }}
        >
          <Trash2 size={22} color="#D64545" />
        </div>

        <div className="flex flex-col" style={{ gap: 8 }}>
          <h2 style={{ color: '#1A1A1A', fontFamily: 'Geist, sans-serif', fontSize: 18, fontWeight: 600 }}>
            テストを削除しますか？
          </h2>
          <p style={{ color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14, lineHeight: 1.5 }}>
            選択した {count} 件のテストとレビュー結果がすべて削除されます。この操作は取り消せません。
          </p>
        </div>

        <div className="flex items-center justify-end" style={{ gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="transition-colors hover:bg-[#F0F1F3] disabled:opacity-40"
            style={{ padding: '10px 16px', borderRadius: 6, border: '1px solid #E6E6E8', background: '#FFFFFF', color: '#666666', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ padding: '10px 16px', borderRadius: 6, border: 'none', background: '#D64545', color: '#FFFFFF', fontFamily: 'Geist, sans-serif', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Trash2 size={14} color="#FFFFFF" />
            削除する
          </button>
        </div>
      </div>
    </div>
  );
}
