export type CupStatus = 'draft' | 'open' | 'full' | 'scheduled' | 'finished';

export type CupColors = {
  primary: string;
  accent: string;
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
};

export type CupCreateRequest = Omit<Cup, 'id' | 'status' | 'createdAt'>;

export type CupUpdateRequest = Partial<CupCreateRequest> & {
  status?: CupStatus;
};
