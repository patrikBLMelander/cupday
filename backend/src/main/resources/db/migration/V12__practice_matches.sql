-- Public practice-match board. Deliberately independent of cup/team/app_user:
-- anyone can post without an account and manages the post via a secret token.
CREATE TABLE practice_match (
  id UUID PRIMARY KEY,
  team_name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('P', 'F', 'MIX')),
  birth_year INTEGER NOT NULL CHECK (birth_year BETWEEN 1990 AND 2030),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 9),
  players_per_side INTEGER NOT NULL CHECK (players_per_side IN (5, 7, 9, 11)),
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT NOT NULL,
  opponent_slots INTEGER NOT NULL DEFAULT 1 CHECK (opponent_slots BETWEEN 1 AND 5),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  cost_sek INTEGER CHECK (cost_sek >= 0),
  notes TEXT,
  manage_token_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX ix_practice_match_status_kickoff ON practice_match (status, kickoff_at);

CREATE TABLE practice_match_booking (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES practice_match(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  message TEXT,
  manage_token_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('BOOKED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX ix_practice_match_booking_match_id ON practice_match_booking (match_id);

-- The same team cannot hold two active slots in one match; cancelled bookings free the name.
CREATE UNIQUE INDEX uq_practice_match_booking_team_active
  ON practice_match_booking (match_id, LOWER(team_name))
  WHERE status = 'BOOKED';