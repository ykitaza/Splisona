-- 評価実行時に実際へ送信したプロンプトを保存する（レポートの「解決済みプロンプト」表示用）
ALTER TABLE evaluations ADD COLUMN resolved_prompt TEXT;
