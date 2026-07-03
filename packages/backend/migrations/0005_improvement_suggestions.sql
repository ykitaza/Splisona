-- テスト完了時に生成する改善提案（JSON 配列）を保存する
ALTER TABLE abtests ADD COLUMN improvement_suggestions TEXT;
