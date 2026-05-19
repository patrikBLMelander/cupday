-- Expand the group_label CHECK constraints from ('A','B') to ('A'..'H') to
-- match the {@link GroupLabel} enum after BE-2.
ALTER TABLE team
  DROP CONSTRAINT IF EXISTS team_group_label_check,
  ADD CONSTRAINT team_group_label_check
    CHECK (group_label IN ('A','B','C','D','E','F','G','H'));

ALTER TABLE match
  DROP CONSTRAINT IF EXISTS match_group_label_check,
  ADD CONSTRAINT match_group_label_check
    CHECK (group_label IN ('A','B','C','D','E','F','G','H'));
