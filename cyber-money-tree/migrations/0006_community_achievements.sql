CREATE TABLE IF NOT EXISTS community_achievements (
  achievement_id TEXT PRIMARY KEY,
  unlocked_at INTEGER NOT NULL,
  value_at_unlock INTEGER
);

CREATE TABLE IF NOT EXISTS combo_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  first_visitor_hash TEXT NOT NULL,
  last_visitor_hash TEXT NOT NULL,
  last_distinct_at INTEGER NOT NULL,
  qualified INTEGER NOT NULL DEFAULT 0 CHECK (qualified IN (0, 1)),
  segment_count INTEGER NOT NULL DEFAULT 0 CHECK (segment_count >= 0)
);

CREATE INDEX IF NOT EXISTS leaf_notes_by_source_created
  ON leaf_notes (source, created_at);
