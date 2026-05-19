export type CupStatus = 'draft' | 'open' | 'full' | 'scheduled' | 'finished';

export type CupColors = {
  primary: string;
  accent: string;
};

export type PlayersPerTeam = 5 | 7 | 9;

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
};

export type CupCreateRequest = Omit<
  Cup,
  'id' | 'status' | 'createdAt' | 'activeTeamCount'
>;

export type CupUpdateRequest = Partial<CupCreateRequest> & {
  status?: CupStatus;
};
