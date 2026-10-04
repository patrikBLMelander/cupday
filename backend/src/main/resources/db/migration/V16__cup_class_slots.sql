-- Slots can be locked per age class, per level, or per class + level (e.g. P13: 4 Lätt + 4 Medel).
-- Empty string means "any": a class-only slot has level = '', a level-only slot has age_class = ''.
ALTER TABLE cup_level_quota ADD COLUMN age_class TEXT NOT NULL DEFAULT '';
ALTER TABLE cup_level_quota DROP CONSTRAINT cup_level_quota_pkey;
ALTER TABLE cup_level_quota ADD PRIMARY KEY (cup_id, age_class, level);

-- Teams in multi-class cups register to one class.
ALTER TABLE team ADD COLUMN age_class TEXT;
