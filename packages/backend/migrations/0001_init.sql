CREATE TABLE IF NOT EXISTS personas (
  persona_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'other',
  source TEXT,
  age INTEGER,
  gender TEXT,
  occupation TEXT,
  deviation_score REAL,
  annual_income REAL,
  education TEXT,
  free_text TEXT,
  avatar_image_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
);

CREATE TABLE IF NOT EXISTS abtests (
  test_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  design_a_image_key TEXT,
  design_b_image_key TEXT,
  design_a_input_type TEXT NOT NULL DEFAULT 'image_upload',
  design_b_input_type TEXT NOT NULL DEFAULT 'image_upload',
  design_a_url TEXT,
  design_b_url TEXT,
  persona_ids TEXT NOT NULL DEFAULT '[]',
  reason_summary_status TEXT,
  reason_summary_a TEXT,
  reason_summary_b TEXT,
  winners_reason_summary TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, test_id)
);

CREATE TABLE IF NOT EXISTS evaluations (
  test_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  winner TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  scores_a TEXT NOT NULL DEFAULT '{}',
  scores_b TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'completed',
  persona_display_name TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  PRIMARY KEY (test_id, persona_id)
);

CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT,
  PRIMARY KEY (user_id, section)
);

CREATE INDEX IF NOT EXISTS idx_abtests_user ON abtests(user_id);
CREATE INDEX IF NOT EXISTS idx_personas_user ON personas(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_test ON evaluations(test_id);
CREATE INDEX IF NOT EXISTS idx_settings_user ON settings(user_id);
