CREATE TABLE share_links (
  token_hash TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  prefix TEXT NOT NULL,        -- 表示用 shr_xxxxxxxx（先頭12文字）
  created_at TEXT NOT NULL
);
CREATE INDEX idx_share_links_test ON share_links(test_id);
