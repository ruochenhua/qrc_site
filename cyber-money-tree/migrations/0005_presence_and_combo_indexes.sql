CREATE INDEX IF NOT EXISTS presence_by_last_seen
  ON presence (last_seen);

CREATE INDEX IF NOT EXISTS waterings_by_created_visitor
  ON waterings (created_at, visitor_hash);
