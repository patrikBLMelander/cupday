-- Cups posted publicly (no account) are managed with a secret token, like practice matches.
-- All new columns are optional so admin-created cups are unaffected.
ALTER TABLE cup
  ADD COLUMN manage_token_hash TEXT,
  ADD COLUMN end_time TIME,
  ADD COLUMN age_classes TEXT NOT NULL DEFAULT '',
  ADD COLUMN level_min SMALLINT CHECK (level_min BETWEEN 1 AND 9),
  ADD COLUMN level_max SMALLINT CHECK (level_max BETWEEN 1 AND 9),
  ADD COLUMN registration_deadline DATE,
  ADD COLUMN external_registration_url TEXT,
  ADD COLUMN description TEXT;

ALTER TABLE cup DROP CONSTRAINT IF EXISTS cup_players_per_team_check;
ALTER TABLE cup ADD CONSTRAINT cup_players_per_team_check CHECK (players_per_team IN (5, 7, 9, 11));

-- Optional locked slots per level, e.g. 8 Lätt + 8 Medel.
CREATE TABLE cup_level_quota (
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  max_teams INTEGER NOT NULL CHECK (max_teams >= 1),
  position INTEGER NOT NULL,
  PRIMARY KEY (cup_id, level)
);
