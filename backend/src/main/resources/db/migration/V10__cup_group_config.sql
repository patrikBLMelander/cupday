ALTER TABLE cup
  ADD COLUMN number_of_groups INTEGER NOT NULL DEFAULT 2
    CHECK (number_of_groups BETWEEN 1 AND 8),
  ADD COLUMN teams_per_group INTEGER NOT NULL DEFAULT 4
    CHECK (teams_per_group >= 2);
