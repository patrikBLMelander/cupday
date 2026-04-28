CREATE TABLE registration (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_registration_cup_id ON registration (cup_id);

CREATE TABLE team (
  id UUID PRIMARY KEY,
  cup_id UUID NOT NULL REFERENCES cup(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  club_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  group_label TEXT CHECK (group_label IN ('A', 'B')),
  status TEXT NOT NULL CHECK (status IN ('RESERVED', 'PAID', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

CREATE INDEX ix_team_cup_id ON team (cup_id);
CREATE INDEX ix_team_registration_id ON team (registration_id);

-- Partial unique: cancelled team names are reusable.
CREATE UNIQUE INDEX uq_team_cup_name_active
  ON team (cup_id, LOWER(name))
  WHERE status != 'CANCELLED';
