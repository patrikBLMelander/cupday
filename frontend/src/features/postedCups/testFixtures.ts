import type { Cup } from '@/features/cups/cupTypes';
import type { Team } from '@/features/teams/teamTypes';

/** YYYY-MM-DD `days` from today (local). */
export function dateIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function buildPostedCup(overrides: Partial<Cup> = {}): Cup {
  return {
    id: crypto.randomUUID(),
    slug: 'grimsta-hostcup',
    name: 'Grimsta Höstcup',
    organizingClubName: 'Västerort FF',
    organizingClubColors: { primary: '138 59% 30%', accent: '42 87% 92%' },
    startDate: dateIn(3),
    endDate: dateIn(4),
    venueName: 'Grimsta IP',
    pitchCount: 1,
    maxTeams: 4,
    registrationFeeSek: 1200,
    paymentInstructions: 'Swisha till 123',
    paymentLagkassanLink: '',
    paymentLagkassanQrUrl: '',
    organizerContactName: 'Anna Berg',
    organizerContactEmail: 'anna@vff.se',
    organizerContactPhone: '070-123 45 67',
    status: 'open',
    createdAt: new Date().toISOString(),
    playersPerTeam: 7,
    clubLogoUrl: '',
    useLevels: true,
    levels: ['Medel', 'Svår'],
    activeTeamCount: 0,
    hasToilets: false,
    hasFood: false,
    hasParking: false,
    mapUrl: '',
    startTime: '09:00:00',
    numberOfGroups: 1,
    teamsPerGroup: 4,
    endTime: '17:00:00',
    ageClasses: ['P13', 'P14'],
    levelMin: 5,
    levelMax: 8,
    registrationDeadline: null,
    externalRegistrationUrl: null,
    description: null,
    publiclyPosted: true,
    slotQuotas: [
      { ageClass: 'P13', level: 'Medel', maxTeams: 2, remaining: 2 },
      { ageClass: 'P14', level: 'Svår', maxTeams: 2, remaining: 2 },
    ],
    ...overrides,
  };
}

export function buildTeam(cupId: string, overrides: Partial<Team> = {}): Team {
  return {
    id: crypto.randomUUID(),
    cupId,
    registrationId: crypto.randomUUID(),
    name: 'Solna BK P13',
    clubName: 'Solna BK',
    contactName: 'Jonas Lind',
    contactEmail: 'jonas@example.com',
    contactPhone: '070-765 43 21',
    groupLabel: null,
    status: 'reserved',
    createdAt: new Date().toISOString(),
    paidAt: null,
    cancelledAt: null,
    level: 'Medel',
    logoUrl: '',
    ...overrides,
  };
}
