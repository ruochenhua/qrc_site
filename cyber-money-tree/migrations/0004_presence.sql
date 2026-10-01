CREATE TABLE IF NOT EXISTS presence (
  visitor_hash TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);
