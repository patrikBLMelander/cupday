CREATE TABLE match (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  group_label TEXT NOT NULL CHECK (group_label IN ('A', 'B')),
  pitch INTEGER NOT NULL CHECK (pitch IN (1, 2)),
  start_time TIMESTAMPTZ NOT NULL,
  home_team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE
);

CREATE INDEX ix_match_cup_id ON match (cup_id);
CREATE INDEX ix_match_cup_id_start_time ON match (cup_id, start_time);
