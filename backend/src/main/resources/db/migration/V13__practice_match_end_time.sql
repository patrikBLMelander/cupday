-- End time for practice matches. Existing rows get kickoff + 90 minutes before the column becomes required.
ALTER TABLE practice_match ADD COLUMN ends_at TIMESTAMPTZ;

UPDATE practice_match SET ends_at = kickoff_at + INTERVAL '90 minutes' WHERE ends_at IS NULL;

ALTER TABLE practice_match
  ALTER COLUMN ends_at SET NOT NULL,
  ADD CONSTRAINT ck_practice_match_ends_after_kickoff CHECK (ends_at > kickoff_at);
