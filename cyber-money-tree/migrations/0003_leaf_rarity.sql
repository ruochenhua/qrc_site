ALTER TABLE leaf_notes ADD COLUMN rarity TEXT NOT NULL DEFAULT 'common'
  CHECK (rarity IN ('common', 'rare', 'legendary'));

UPDATE leaf_notes SET rarity = 'rare' WHERE visitor_hash = 'founder-note-3';
