-- Level becomes a range (e.g. Lätt+ – Medel). A single level is stored as min = max.
ALTER TABLE practice_match
  ADD COLUMN level_min SMALLINT,
  ADD COLUMN level_max SMALLINT;

UPDATE practice_match SET level_min = level, level_max = level;

ALTER TABLE practice_match
  ALTER COLUMN level_min SET NOT NULL,
  ALTER COLUMN level_max SET NOT NULL,
  ADD CONSTRAINT ck_practice_match_level_range CHECK (level_min BETWEEN 1 AND 9 AND level_max BETWEEN level_min AND 9),
  DROP COLUMN level;
