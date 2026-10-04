import { http, HttpResponse } from 'msw';

import type { Cup, SlotQuota } from '@/features/cups/cupTypes';
import type {
  CreatePostedCupResponse,
  ManagedCup,
  PostedCupRequest,
  SettableTeamStatus,
} from '@/features/postedCups/postedCupTypes';
import { db } from '@/mocks/db';

const TOKEN_HEADER = 'X-Manage-Token';
const ALLOWED_PLAYERS: ReadonlySet<number> = new Set([5, 7, 9, 11]);

function problem(status: number, title: string, detail: string): Response {
  return HttpResponse.json(
    { type: 'about:blank', title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function activeTeams(cupId: string): number {
  return db.read().teams.filter((t) => t.cupId === cupId && t.status !== 'cancelled').length;
}

function matches(quota: SlotQuota, ageClass: string | null | undefined, level: string | null | undefined): boolean {
  return (
    (quota.ageClass === '' || quota.ageClass.toLowerCase() === (ageClass ?? '').toLowerCase()) &&
    (quota.level === '' || quota.level.toLowerCase() === (level ?? '').toLowerCase())
  );
}

/** Recomputes `remaining` on stored quotas from the current teams. */
export function withQuotas(cup: Cup): Cup {
  if (!cup.slotQuotas?.length) return cup;
  const teams = db.read().teams.filter((t) => t.cupId === cup.id && t.status !== 'cancelled');
  const slotQuotas = cup.slotQuotas.map((q) => {
    const taken = teams.filter((t) => matches(q, t.ageClass, t.level)).length;
    return { ...q, remaining: Math.max(0, q.maxTeams - taken) };
  });
  return { ...cup, slotQuotas };
}

/** Mirrors the backend slot check on registration; returns an error response or null. */
export function quotaProblem(cup: Cup, classes: (string | null)[], levels: (string | null)[]): Response | null {
  const quotas = withQuotas(cup).slotQuotas ?? [];
  if (quotas.length === 0) return null;
  const wanted = new Map<SlotQuota, number>();
  for (let i = 0; i < levels.length; i += 1) {
    const quota = quotas.find((q) => matches(q, classes[i], levels[i]));
    if (!quota) return problem(400, 'Validation', 'Choose a class and level offered by this cup');
    wanted.set(quota, (wanted.get(quota) ?? 0) + 1);
  }
  for (const [quota, count] of wanted) {
    if (count > quota.remaining) return problem(422, 'Cup is full', 'No remaining slots');
  }
  return null;
}

function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
  return slug || 'cup';
}

function validate(body: PostedCupRequest, active: number): Response | null {
  const required = ['name', 'organizingClubName', 'venueName', 'contactName', 'contactPhone', 'contactEmail'] as const;
  const missing = required.find((f) => !body[f]?.trim());
  if (missing) return problem(400, 'Validation', `${missing} is required`);
  if (body.acceptTerms !== true) return problem(400, 'Validation', 'acceptTerms must be true');
  if (body.website?.trim()) return problem(400, 'Validation', 'Request rejected');
  if (!body.ageClasses?.length) return problem(400, 'Validation', 'ageClasses is required');
  if (!ALLOWED_PLAYERS.has(body.playersPerTeam)) return problem(400, 'Validation', 'invalid playersPerTeam');
  if (body.endDate < body.startDate) return problem(400, 'Validation', 'endDate must not be before startDate');
  if (body.endTime <= body.startTime) return problem(400, 'Validation', 'endTime must be after startTime');
  if (body.levelMin > body.levelMax) return problem(400, 'Validation', 'levelMin must not be above levelMax');
  if (body.maxTeams < active) {
    return problem(400, 'Validation', `maxTeams cannot be lower than the number of registered teams (${active})`);
  }
  if (body.ageClasses.length > 1 && body.slots.length === 0) {
    return problem(400, 'Validation', 'slots are required per age class when the cup has several classes');
  }
  if (body.slots.length > 0) {
    const sum = body.slots.reduce((s, q) => s + q.maxTeams, 0);
    if (sum !== body.maxTeams) {
      return problem(400, 'Validation', `slots must add up to maxTeams (${sum} of ${body.maxTeams})`);
    }
  }
  return null;
}

function applyRequest(cup: Cup, body: PostedCupRequest): Cup {
  return {
    ...cup,
    name: body.name.trim(),
    organizingClubName: body.organizingClubName.trim(),
    clubLogoUrl: body.clubLogoUrl?.trim() ?? '',
    startDate: body.startDate,
    endDate: body.endDate,
    startTime: `${body.startTime}:00`.slice(0, 8),
    endTime: `${body.endTime}:00`.slice(0, 8),
    venueName: body.venueName.trim(),
    ageClasses: body.ageClasses.map((a) => a.trim()),
    playersPerTeam: body.playersPerTeam,
    levelMin: body.levelMin,
    levelMax: body.levelMax,
    maxTeams: body.maxTeams,
    registrationFeeSek: body.registrationFeeSek,
    registrationDeadline: body.registrationDeadline,
    externalRegistrationUrl: body.externalRegistrationUrl?.trim() || null,
    paymentLagkassanLink: body.paymentLink?.trim() ?? '',
    paymentInstructions: body.paymentInstructions?.trim() ?? '',
    organizerContactName: body.contactName.trim(),
    organizerContactPhone: body.contactPhone.trim(),
    organizerContactEmail: body.contactEmail.trim(),
    description: body.description?.trim() || null,
    hasToilets: body.hasToilets,
    hasFood: body.hasFood,
    hasParking: body.hasParking,
    mapUrl: body.mapUrl?.trim() ?? '',
    useLevels: body.slots.some((q) => q.level),
    levels: [...new Set(body.slots.flatMap((q) => (q.level ? [q.level] : [])))],
    slotQuotas: body.slots.map((q) => ({
      ageClass: body.ageClasses.length > 1 ? q.ageClass ?? '' : '',
      level: q.level ?? '',
      maxTeams: q.maxTeams,
      remaining: q.maxTeams,
    })),
  };
}

function authorized(request: Request, id: string): Cup | Response {
  const cup = db.read().cups.find((c) => c.id === id);
  if (!cup) return problem(404, 'Not found', 'Cup not found');
  const token = db.read().postedCupTokens[id];
  if (!token || request.headers.get(TOKEN_HEADER) !== token) {
    return problem(403, 'Forbidden', 'Invalid manage token');
  }
  return cup;
}

function response(cup: Cup): Cup {
  return withQuotas({ ...cup, activeTeamCount: activeTeams(cup.id) });
}

export const postedCupHandlers = [
  http.post('/api/cups', async ({ request }) => {
    const body = (await request.json()) as PostedCupRequest;
    const invalid = validate(body, 0);
    if (invalid) return invalid;
    const existing = new Set(db.read().cups.map((c) => c.slug));
    const base = slugify(body.name);
    let slug = base;
    for (let n = 2; existing.has(slug); n += 1) slug = `${base}-${n}`;
    const blank: Cup = {
      id: crypto.randomUUID(),
      slug,
      name: '',
      organizingClubName: '',
      organizingClubColors: { primary: '138 59% 30%', accent: '42 87% 92%' },
      startDate: '',
      endDate: '',
      venueName: '',
      pitchCount: 1,
      maxTeams: 2,
      registrationFeeSek: 0,
      paymentInstructions: '',
      paymentLagkassanLink: '',
      paymentLagkassanQrUrl: '',
      organizerContactName: '',
      organizerContactEmail: '',
      organizerContactPhone: '',
      status: 'open',
      createdAt: new Date().toISOString(),
      playersPerTeam: 7,
      clubLogoUrl: '',
      useLevels: false,
      levels: [],
      activeTeamCount: 0,
      hasToilets: false,
      hasFood: false,
      hasParking: false,
      mapUrl: '',
      startTime: null,
      numberOfGroups: Math.min(8, Math.max(1, Math.ceil(body.maxTeams / 4))),
      teamsPerGroup: 4,
      publiclyPosted: true,
    };
    const cup = applyRequest(blank, body);
    const manageToken = crypto.randomUUID();
    db.write((draft) => {
      draft.cups.push(cup);
      draft.postedCupTokens[cup.id] = manageToken;
    });
    const payload: CreatePostedCupResponse = { cup: response(cup), manageToken };
    return HttpResponse.json(payload, { status: 201 });
  }),

  http.get('/api/cups/:id/manage', ({ params, request }) => {
    const cup = authorized(request, String(params.id));
    if (cup instanceof Response) return cup;
    const payload: ManagedCup = { cup: response(cup), teams: db.read().teams.filter((t) => t.cupId === cup.id) };
    return HttpResponse.json(payload);
  }),

  http.put('/api/cups/:id/manage', async ({ params, request }) => {
    const cup = authorized(request, String(params.id));
    if (cup instanceof Response) return cup;
    const body = (await request.json()) as PostedCupRequest;
    const invalid = validate(body, activeTeams(cup.id));
    if (invalid) return invalid;
    const updated = applyRequest(cup, body);
    db.write((draft) => {
      draft.cups = draft.cups.map((c) => (c.id === cup.id ? updated : c));
    });
    return HttpResponse.json(response(updated));
  }),

  http.delete('/api/cups/:id/manage', ({ params, request }) => {
    const cup = authorized(request, String(params.id));
    if (cup instanceof Response) return cup;
    db.write((draft) => {
      draft.cups = draft.cups.filter((c) => c.id !== cup.id);
      draft.teams = draft.teams.filter((t) => t.cupId !== cup.id);
      delete draft.postedCupTokens[cup.id];
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch('/api/cups/:id/manage/teams/:teamId', async ({ params, request }) => {
    const cup = authorized(request, String(params.id));
    if (cup instanceof Response) return cup;
    const { status } = (await request.json()) as { status: SettableTeamStatus };
    const team = db.read().teams.find((t) => t.id === params.teamId && t.cupId === cup.id);
    if (!team) return problem(404, 'Not found', 'Team not found');
    if (team.status === 'cancelled') return problem(422, 'Invalid team transition', 'Cannot modify a cancelled team');
    const now = new Date().toISOString();
    db.write((draft) => {
      const target = draft.teams.find((t) => t.id === team.id);
      if (!target) return;
      target.status = status;
      if (status === 'paid') target.paidAt = now;
      if (status === 'cancelled') target.cancelledAt = now;
    });
    return HttpResponse.json(db.read().teams.find((t) => t.id === team.id));
  }),
];
