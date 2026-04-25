export type TeamStatus = 'reserved' | 'paid' | 'cancelled';

export type GroupLabel = 'A' | 'B';

export type Team = {
  id: string;
  cupId: string;
  registrationId: string;
  name: string;
  clubName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  groupLabel: GroupLabel | null;
  status: TeamStatus;
  createdAt: string;
  paidAt: string | null;
  cancelledAt: string | null;
};

/** Public projection of a team (no contact info). */
export type PublicTeam = {
  id: string;
  name: string;
  groupLabel: GroupLabel | null;
  status: TeamStatus;
};

export type Registration = {
  id: string;
  cupId: string;
  teamIds: string[];
  createdAt: string;
};

export type RegistrationCreateRequest = {
  clubName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** Length 1 or 2. */
  teamNames: string[];
};

export type RegistrationCreateResponse = {
  registrationId: string;
  teamIds: string[];
};
