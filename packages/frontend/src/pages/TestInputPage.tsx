import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { testDraft } from '../lib/testDraft';

function FileUploadArea({
  side,
  file,
  onFileChange,
}: {
  side: 'A' | 'B';
  file: File | null;
  onFileChange: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-semibold text-gray-700">デザイン{side}</p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-48 h-36 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-400 transition-colors overflow-hidden"
      >
        {preview ? (
          <img src={preview} alt={`デザイン${side}プレビュー`} className="object-cover w-full h-full" />
        ) : (
          <span className="text-sm">クリックして選択</span>
        )}
      </button>
      <input
        ref={inputRef}
        data-testid="file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            testDraft.setFile(side, f);
            onFileChange(f);
          }
        }}
      />
      {file && <p className="text-xs text-gray-500 truncate max-w-[12rem]">{file.name}</p>}
    </div>
  );
}

export function TestInputPage() {
  const navigate = useNavigate();
  const initial = testDraft.get();
  const [title, setTitle] = useState(initial.title);
  const [fileA, setFileA] = useState<File | null>(initial.fileA);
  const [fileB, setFileB] = useState<File | null>(initial.fileB);

  const canProceed = title.trim().length > 0 && fileA !== null && fileB !== null;

  function handleTitleChange(value: string) {
    setTitle(value);
    testDraft.setTitle(value);
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">テスト作成 — デザイン入力</h1>

      <div className="mb-6">
        <label htmlFor="test-title" className="block text-sm font-medium text-gray-700 mb-1">
          テストタイトル
        </label>
        <input
          id="test-title"
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="例: ランディングページ A/B テスト"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex justify-center gap-12 mb-8">
        <FileUploadArea
          side="A"
          file={fileA}
          onFileChange={(f) => setFileA(f)}
        />
        <FileUploadArea
          side="B"
          file={fileB}
          onFileChange={(f) => setFileB(f)}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => navigate('/tests/new/personas')}
          className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          次へ
        </button>
      </div>
    </div>
  );
}
