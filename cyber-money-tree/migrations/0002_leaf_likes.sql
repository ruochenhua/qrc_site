CREATE TABLE IF NOT EXISTS leaf_likes (
  leaf_id INTEGER NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (leaf_id, visitor_hash),
  FOREIGN KEY (leaf_id) REFERENCES leaf_notes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS likes_by_visitor
  ON leaf_likes (visitor_hash, leaf_id);
