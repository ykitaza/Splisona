-- Seed: デフォルトペルソナ再作成 + 完了済みレポート2件
-- 旧デフォルトペルソナを削除（新12体は list() 呼び出し時に自動作成される）
DELETE FROM personas WHERE persona_id LIKE 'default-%' AND user_id = 'demo-user01@gmail.com';

-- 旧シードテストを削除して再投入
DELETE FROM evaluations WHERE test_id IN ('seed-test-01', 'seed-test-02');
DELETE FROM abtests WHERE test_id IN ('seed-test-01', 'seed-test-02');

-- テスト1: B圧勝 (9-3) — 12体
INSERT INTO abtests (test_id, user_id, title, status, design_a_image_key, design_b_image_key, design_a_input_type, design_b_input_type, persona_ids, reason_summary_status, reason_summary_a, reason_summary_b, winners_reason_summary, created_at, updated_at)
VALUES (
  'seed-test-01',
  'demo-user01@gmail.com',
  '[サンプル] AURORA LP比較: ミニマル vs ボールド',
  'completed',
  'demo-user01@gmail.com/seed-test-01/A.png',
  'demo-user01@gmail.com/seed-test-01/B.png',
  'image_upload',
  'image_upload',
  '["default-01","default-02","default-03","default-04","default-05","default-06","default-07","default-08","default-09","default-10","default-11","default-12"]',
  'ready',
  '["情報が整理されていて読みやすく、信頼感がある","料金や実績の根拠が明示されていて安心できる"]',
  '["CTAが目立ち、行動を起こしやすい","ダークUIが先進的で印象に残る","AI機能のバッジが差別化ポイントとして効いている","視覚的なインパクトが強く、ブランドの世界観が伝わる"]',
  'CTAが目立ち行動を起こしやすい、ダークUIが先進的で印象に残る、AI機能のバッジが差別化ポイントとして効いている、視覚的インパクトが強くブランドの世界観が伝わる',
  '2026-06-28T10:00:00.000Z',
  '2026-06-28T10:00:00.000Z'
);

INSERT INTO evaluations (test_id, persona_id, persona_display_name, winner, confidence, reason, scores_a, scores_b, status, evaluated_at) VALUES
('seed-test-01', 'default-01', 'タクミ', 'B', 0.9, 'CTAボタンがでかくて目立つ。Bの方がパッと見で何をすべきかわかる。Aは余白が多くてスクロールしないとCTAに辿り着けない。', '{"usability":60,"aesthetics":70,"clarity":70,"engagement":50,"trust":70}', '{"usability":80,"aesthetics":80,"clarity":70,"engagement":90,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-02', 'ナオ', 'B', 0.8, '第一印象でBの方が「使ってみたい」と思った。ダークで目を引くし、トライアルボタンもわかりやすい。', '{"usability":70,"aesthetics":60,"clarity":70,"engagement":60,"trust":70}', '{"usability":70,"aesthetics":90,"clarity":70,"engagement":90,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-03', 'ヨウコ', 'A', 0.7, '白背景の方が文字が読みやすく、情報がきちんと整理されている印象。ダークテーマは目が疲れそうで、長時間比較検討するには不向き。', '{"usability":80,"aesthetics":60,"clarity":90,"engagement":50,"trust":90}', '{"usability":60,"aesthetics":70,"clarity":60,"engagement":70,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-04', 'マサル', 'A', 0.75, '12,000+チーム、99.9% Uptimeなどの実績数値が掲載されている点が決め手。Bには具体的な裏付けがなく、派手なだけに見える。', '{"usability":80,"aesthetics":60,"clarity":90,"engagement":50,"trust":90}', '{"usability":60,"aesthetics":80,"clarity":60,"engagement":70,"trust":50}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-05', 'ソラ', 'B', 0.85, 'AI機能のバッジやグラデーションの使い方がモダン。プロダクトスクリーンショットのフレームもダークUIと調和していて、技術力を感じる。', '{"usability":70,"aesthetics":60,"clarity":80,"engagement":50,"trust":70}', '{"usability":70,"aesthetics":90,"clarity":70,"engagement":90,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-06', 'ミウ', 'B', 0.7, 'タイポグラフィの階層設計、カラーパレットの統一感、余白の使い方がBの方がプロフェッショナル。ただしAの可読性も悪くない。', '{"usability":70,"aesthetics":70,"clarity":80,"engagement":50,"trust":70}', '{"usability":70,"aesthetics":90,"clarity":70,"engagement":80,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-07', 'アキラ', 'B', 0.75, 'ヘッダーにCTAが配置されていて、スクロール不要で次のアクションに移れる。AはナビがテキストリンクのみでCTAが弱い。', '{"usability":70,"aesthetics":70,"clarity":80,"engagement":50,"trust":80}', '{"usability":80,"aesthetics":70,"clarity":70,"engagement":80,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-08', 'レイ', 'A', 0.75, '情報の優先順位が明確で、3カラムのフィーチャー比較が一覧しやすい。Bは見栄えは良いが、スクロールしないと全体像が掴めない。', '{"usability":90,"aesthetics":60,"clarity":90,"engagement":50,"trust":80}', '{"usability":70,"aesthetics":80,"clarity":60,"engagement":80,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-09', 'ユカ', 'B', 0.65, '「14日間無料トライアル」の文言がボタンに直接書いてあるのが良い。Aの「無料で始める」は具体性に欠ける。', '{"usability":70,"aesthetics":60,"clarity":70,"engagement":50,"trust":70}', '{"usability":70,"aesthetics":70,"clarity":70,"engagement":70,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-10', 'ダイチ', 'B', 0.6, '無料トライアルの訴求が明確で、コスト面の不安なく試せる印象。Aは料金ページへの導線がわかりにくい。', '{"usability":70,"aesthetics":55,"clarity":75,"engagement":50,"trust":75}', '{"usability":70,"aesthetics":65,"clarity":70,"engagement":65,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-11', 'アオイ', 'B', 0.95, '圧倒的にBがおしゃれ。グラデーションのロゴ、ダークUI、パープル系のアクセントカラーが今っぽい。AはSaaS感が強くて既視感がある。', '{"usability":70,"aesthetics":50,"clarity":70,"engagement":40,"trust":70}', '{"usability":70,"aesthetics":100,"clarity":60,"engagement":100,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-01', 'default-12', 'シュン', 'B', 0.9, 'Bは独自の世界観があって、他のSaaSサイトと差別化できている。Aは既視感が強い。SNSでシェアするならBを選ぶ。', '{"usability":60,"aesthetics":50,"clarity":70,"engagement":40,"trust":70}', '{"usability":60,"aesthetics":100,"clarity":60,"engagement":100,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z');

-- テスト2: 接戦 (7-5) — 12体
INSERT INTO abtests (test_id, user_id, title, status, design_a_image_key, design_b_image_key, design_a_input_type, design_b_input_type, persona_ids, reason_summary_status, reason_summary_a, reason_summary_b, winners_reason_summary, created_at, updated_at)
VALUES (
  'seed-test-02',
  'demo-user01@gmail.com',
  '[サンプル] AURORA LP比較: 情報量 vs インパクト',
  'completed',
  'demo-user01@gmail.com/seed-test-02/A.png',
  'demo-user01@gmail.com/seed-test-02/B.png',
  'image_upload',
  'image_upload',
  '["default-01","default-02","default-03","default-04","default-05","default-06","default-07","default-08","default-09","default-10","default-11","default-12"]',
  'ready',
  '["情報設計が明快で、判断に必要な材料が揃っている","実績数値の提示が信頼感につながる","ユーザビリティと可読性に優れる","料金体系が一目でわかる"]',
  '["ビジュアルのインパクトが強く、差別化を感じる","AIバッジやグラデーションなど細部の作り込みが良い","世界観の統一感がブランディングに効いている"]',
  '',
  '2026-06-28T10:00:00.000Z',
  '2026-06-28T10:00:00.000Z'
);

INSERT INTO evaluations (test_id, persona_id, persona_display_name, winner, confidence, reason, scores_a, scores_b, status, evaluated_at) VALUES
('seed-test-02', 'default-01', 'タクミ', 'B', 0.8, 'Bの方がCTAまでのステップが少なく、パッと見で行動できる。Aは読ませようとする構成が多い。', '{"usability":65,"aesthetics":60,"clarity":70,"engagement":55,"trust":70}', '{"usability":75,"aesthetics":85,"clarity":65,"engagement":85,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-02', 'ナオ', 'A', 0.65, '情報量が多い方が安心できる。Bはおしゃれだけど中身が薄い印象。', '{"usability":75,"aesthetics":60,"clarity":80,"engagement":55,"trust":80}', '{"usability":65,"aesthetics":80,"clarity":60,"engagement":75,"trust":55}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-03', 'ヨウコ', 'A', 0.85, '料金表が一目で比較でき、導入実績の数字も明示されている。Bは華やかだが肝心の根拠が弱い。', '{"usability":85,"aesthetics":55,"clarity":90,"engagement":45,"trust":90}', '{"usability":60,"aesthetics":75,"clarity":55,"engagement":70,"trust":55}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-04', 'マサル', 'A', 0.8, '運営元の情報、セキュリティ認証マークが見つけやすい。Bはビジュアル優先で信頼性の根拠が奥にある。', '{"usability":80,"aesthetics":55,"clarity":85,"engagement":50,"trust":90}', '{"usability":65,"aesthetics":80,"clarity":60,"engagement":70,"trust":55}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-05', 'ソラ', 'B', 0.75, 'インタラクションのマイクロアニメーションが丁寧。技術スタックの記載もあり、エンジニア視点で好印象。', '{"usability":70,"aesthetics":65,"clarity":75,"engagement":55,"trust":70}', '{"usability":75,"aesthetics":90,"clarity":70,"engagement":85,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-06', 'ミウ', 'B', 0.7, 'グリッドシステムの一貫性、色の抑制、タイポの階層がBの方が洗練されている。Aは普通に良いが記憶に残らない。', '{"usability":70,"aesthetics":70,"clarity":80,"engagement":50,"trust":70}', '{"usability":70,"aesthetics":90,"clarity":70,"engagement":80,"trust":70}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-07', 'アキラ', 'A', 0.7, '3カラムの機能比較表がダッシュボード選定時に必要な情報をカバーしている。Bはスクロール量が多い。', '{"usability":85,"aesthetics":60,"clarity":85,"engagement":50,"trust":80}', '{"usability":70,"aesthetics":75,"clarity":65,"engagement":75,"trust":65}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-08', 'レイ', 'A', 0.8, 'ファーストビューで価値提案→機能→料金→CTAの導線が教科書的に整っている。Bは世界観先行で情報密度が低い。', '{"usability":90,"aesthetics":60,"clarity":90,"engagement":50,"trust":85}', '{"usability":70,"aesthetics":80,"clarity":60,"engagement":80,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-09', 'ユカ', 'A', 0.7, '料金プランの比較表が見やすく、「月額いくらで何ができるか」が即座にわかる。Bは価格が見つけにくい。', '{"usability":80,"aesthetics":50,"clarity":85,"engagement":50,"trust":80}', '{"usability":60,"aesthetics":70,"clarity":55,"engagement":65,"trust":55}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-10', 'ダイチ', 'A', 0.6, 'シンプルで余計な装飾がない分、中身に集中できる。Bは格好いいけど結局何がいくらなのかがすぐわからない。', '{"usability":80,"aesthetics":50,"clarity":80,"engagement":50,"trust":80}', '{"usability":60,"aesthetics":70,"clarity":60,"engagement":70,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-11', 'アオイ', 'B', 0.9, 'Bの方がブランドとしての存在感がある。SNSで紹介するときに「このサービスかっこいい」と言える。', '{"usability":65,"aesthetics":50,"clarity":65,"engagement":45,"trust":65}', '{"usability":65,"aesthetics":95,"clarity":60,"engagement":95,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z'),
('seed-test-02', 'default-12', 'シュン', 'B', 0.85, '独自のビジュアル言語を持っていて、他と差別化できている。Aは量産型SaaSサイトの域を出ない。', '{"usability":60,"aesthetics":50,"clarity":70,"engagement":40,"trust":70}', '{"usability":60,"aesthetics":95,"clarity":60,"engagement":95,"trust":60}', 'completed', '2026-06-28T10:00:00.000Z');
