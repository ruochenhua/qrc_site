CREATE TABLE IF NOT EXISTS tree_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  total_waterings INTEGER NOT NULL DEFAULT 0 CHECK (total_waterings >= 0)
);

INSERT OR IGNORE INTO tree_stats (id, total_waterings) VALUES (1, 0);

CREATE TABLE IF NOT EXISTS waterings (
  water_no INTEGER PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS waterings_by_visitor
  ON waterings (visitor_hash, water_no DESC);

CREATE TABLE IF NOT EXISTS leaf_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  water_no INTEGER UNIQUE,
  visitor_hash TEXT NOT NULL,
  poster_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  ending_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('seed', 'visitor')),
  FOREIGN KEY (water_no) REFERENCES waterings (water_no)
);

CREATE INDEX IF NOT EXISTS leaves_by_created
  ON leaf_notes (created_at DESC, id DESC);

INSERT INTO leaf_notes
  (visitor_hash, poster_id, subject_id, ending_id, created_at, source)
VALUES
  ('founder-note-1', 'office-sun', 'passerby', 'drink-water', 1790000001, 'seed'),
  ('founder-note-2', 'office-sun', 'worker', 'clock-out', 1790000002, 'seed'),
  ('founder-note-3', 'window-garden', 'tired', 'rest', 1790000003, 'seed'),
  ('founder-note-4', 'window-garden', 'tomorrow', 'good-news', 1790000004, 'seed'),
  ('founder-note-5', 'roof-breakthrough', 'passerby', 'look-outside', 1790000005, 'seed'),
  ('founder-note-6', 'city-canopy', 'worker', 'clock-out', 1790000006, 'seed');
