export type CupStatus = 'draft' | 'open' | 'full' | 'scheduled' | 'finished';

export type CupColors = {
  primary: string;
  accent: string;
};

export type PlayersPerTeam = 5 | 7 | 9 | 11;

/** Locked team slots for an age class and/or level ('' = any) and how many are free (posted cups). */
export type SlotQuota = {
  ageClass: string;
  level: string;
  maxTeams: number;
  remaining: number;
};

export type Cup = {
  id: string;
  slug: string;
  name: string;
  organizingClubName: string;
  organizingClubColors: CupColors;
  startDate: string;
  endDate: string;
  venueName: string;
  pitchCount: number;
  maxTeams: number;
  registrationFeeSek: number;
  paymentInstructions: string;
  paymentLagkassanLink: string;
  paymentLagkassanQrUrl: string;
  organizerContactName: string;
  organizerContactEmail: string;
  organizerContactPhone: string;
  status: CupStatus;
  createdAt: string;
  playersPerTeam: PlayersPerTeam;
  clubLogoUrl: string;
  useLevels: boolean;
  /** Empty when {@link useLevels} is false. */
  levels: string[];
  activeTeamCount: number;
  hasToilets: boolean;
  hasFood: boolean;
  hasParking: boolean;
  /** Optional Google Maps (or any) directions URL. Empty string when unset. */
  mapUrl: string;
  /** Optional kickoff time on {@link startDate} as {@code HH:mm:ss}. Null when unset. */
  startTime: string | null;
  /** Number of groups (1-8); selects A..N from {@link GroupLabel}. */
  numberOfGroups: number;
  /** Teams per group (≥2). */
  teamsPerGroup: number;
  /** End of play each day as {@code HH:mm:ss}; set on posted cups. */
  endTime?: string | null;
  /** Age classes such as "P13". Empty for admin-created cups. */
  ageClasses?: string[];
  /** Level range on the 1–9 practice scale (Lätt− … Svår+). */
  levelMin?: number | null;
  levelMax?: number | null;
  registrationDeadline?: string | null;
  /** When set, teams register on the organizer's own site instead of here. */
  externalRegistrationUrl?: string | null;
  description?: string | null;
  /** True for cups posted without an account (managed with a manage link). */
  publiclyPosted?: boolean;
  /** Locked slots per class and/or level; only filled on the single-cup endpoint. */
  slotQuotas?: SlotQuota[];
};

export type CupCreateRequest = Omit<
  Cup,
  | 'id'
  | 'status'
  | 'createdAt'
  | 'activeTeamCount'
  | 'endTime'
  | 'ageClasses'
  | 'levelMin'
  | 'levelMax'
  | 'registrationDeadline'
  | 'externalRegistrationUrl'
  | 'description'
  | 'publiclyPosted'
  | 'slotQuotas'
>;

export type CupUpdateRequest = Partial<CupCreateRequest> & {
  status?: CupStatus;
};
