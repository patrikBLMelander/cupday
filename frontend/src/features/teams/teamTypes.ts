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
  level: string | null;
  /** Empty string when unset. */
  logoUrl: string;
};

/** Public projection of a team (no contact info). */
export type PublicTeam = {
  id: string;
  name: string;
  groupLabel: GroupLabel | null;
  status: TeamStatus;
  /** Populated only when the cup uses levels. */
  level: string | null;
  /** Empty string when unset. */
  logoUrl: string;
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
  /** Required when the cup uses levels — one entry per team in {@link teamNames}. */
  teamLevels?: string[];
  /** Optional logo URLs, one per team in {@link teamNames}; missing → empty. */
  teamLogoUrls?: string[];
};

export type RegistrationCreateResponse = {
  registrationId: string;
  teamIds: string[];
};

export type RegistrationDetail = {
  registration: Registration;
  teams: PublicTeam[];
};
