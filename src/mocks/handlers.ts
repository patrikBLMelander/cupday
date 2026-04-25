import { http, HttpResponse } from 'msw';

import type {
  Cup,
  CupCreateRequest,
  CupUpdateRequest,
} from '@/features/cups/cupTypes';
import type {
  GroupLabel,
  PublicTeam,
  RegistrationCreateRequest,
  RegistrationCreateResponse,
  RegistrationDetail,
  Team,
  TeamStatus,
} from '@/features/teams/teamTypes';
import { db, type MockUser } from '@/mocks/db';

const EMAIL_RE = /^.+@.+\..+$/;
const SLUG_RE = /^[a-z0-9-]+$/;
const MIN_PASSWORD_LEN = 6;

type ProblemDetail = {
  type: string;
  title: string;
  status: number;
  detail: string;
};

function problem(
  status: number,
  title: string,
  detail: string,
): HttpResponse<ProblemDetail> {
  const body: ProblemDetail = { type: 'about:blank', title, status, detail };
  return HttpResponse.json(body, {
    status,
    headers: { 'Content-Type': 'application/problem+json' },
  });
}

function getBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice('Bearer '.length);
}

type AuthOk = { user: MockUser };
type AuthErr = { error: HttpResponse<ProblemDetail> };

function requireAuth(request: Request): AuthOk | AuthErr {
  const token = getBearerToken(request);
  if (!token) return { error: problem(401, 'Unauthorized', 'Missing bearer token') };
  const state = db.read();
  const session = state.sessions.find((s) => s.token === token);
  if (!session) return { error: problem(401, 'Unauthorized', 'Invalid token') };
  const user = state.users.find((u) => u.id === session.userId);
  if (!user) return { error: problem(401, 'Unauthorized', 'User not found') };
  return { user };
}

function isAuthErr(result: AuthOk | AuthErr): result is AuthErr {
  return 'error' in result;
}

function validateCupBody(
  body: Partial<CupCreateRequest>,
): HttpResponse<ProblemDetail> | null {
  if (!body.name?.trim()) return problem(400, 'Validation', 'name is required');
  if (!body.slug?.trim()) return problem(400, 'Validation', 'slug is required');
  if (!SLUG_RE.test(body.slug)) {
    return problem(400, 'Validation', 'slug must match [a-z0-9-]+');
  }
  if (!body.startDate || !body.endDate) {
    return problem(400, 'Validation', 'startDate and endDate are required');
  }
  if (body.startDate > body.endDate) {
    return problem(400, 'Validation', 'startDate must be on or before endDate');
  }
  if (typeof body.pitchCount !== 'number' || body.pitchCount < 1) {
    return problem(400, 'Validation', 'pitchCount must be at least 1');
  }
  if (typeof body.maxTeams !== 'number' || body.maxTeams < 2) {
    return problem(400, 'Validation', 'maxTeams must be at least 2');
  }
  if (typeof body.registrationFeeSek !== 'number' || body.registrationFeeSek < 0) {
    return problem(400, 'Validation', 'registrationFeeSek must be non-negative');
  }
  if (
    body.organizerContactEmail &&
    !EMAIL_RE.test(body.organizerContactEmail)
  ) {
    return problem(400, 'Validation', 'organizerContactEmail is invalid');
  }
  return null;
}

type LoginBody = { email?: string; password?: string };
type LoginResponse = { token: string; user: MockUser };
type MeResponse = { user: MockUser };

export const handlers = [
  // --- Auth ---
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginBody;
    const email = body.email?.trim() ?? '';
    const password = body.password ?? '';
    if (!EMAIL_RE.test(email) || password.length < MIN_PASSWORD_LEN) {
      return problem(401, 'Invalid credentials', 'Email or password is invalid');
    }
    let token = '';
    let userId = '';
    db.write((draft) => {
      const existing = draft.users.find((u) => u.email === email);
      if (existing) {
        userId = existing.id;
      } else {
        userId = crypto.randomUUID();
        draft.users.push({ id: userId, email });
      }
      token = crypto.randomUUID();
      draft.sessions.push({ token, userId });
    });
    const user = db.read().users.find((u) => u.id === userId)!;
    const payload: LoginResponse = { token, user };
    return HttpResponse.json(payload);
  }),

  http.post('/api/auth/logout', ({ request }) => {
    const token = getBearerToken(request);
    if (token) {
      db.write((draft) => {
        draft.sessions = draft.sessions.filter((s) => s.token !== token);
      });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const payload: MeResponse = { user: auth.user };
    return HttpResponse.json(payload);
  }),

  // --- Cups (admin) ---
  http.get('/api/admin/cups', ({ request }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const cups = db
      .read()
      .cups.slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return HttpResponse.json(cups);
  }),

  http.post('/api/admin/cups', async ({ request }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const body = (await request.json()) as CupCreateRequest;
    const validation = validateCupBody(body);
    if (validation) return validation;
    if (db.read().cups.some((c) => c.slug === body.slug)) {
      return problem(
        409,
        'Slug already exists',
        `A cup with slug "${body.slug}" already exists`,
      );
    }
    const cup: Cup = {
      ...body,
      id: crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date().toISOString(),
    };
    db.write((draft) => {
      draft.cups.push(cup);
    });
    return HttpResponse.json(cup, { status: 201 });
  }),

  http.get('/api/admin/cups/:id', ({ request, params }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const cup = db.read().cups.find((c) => c.id === params.id);
    if (!cup) return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    return HttpResponse.json(cup);
  }),

  http.patch('/api/admin/cups/:id', async ({ request, params }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const body = (await request.json()) as CupUpdateRequest;
    if (body.slug !== undefined) {
      if (!SLUG_RE.test(body.slug)) {
        return problem(400, 'Validation', 'slug must match [a-z0-9-]+');
      }
      const collision = db
        .read()
        .cups.find((c) => c.slug === body.slug && c.id !== params.id);
      if (collision) {
        return problem(
          409,
          'Slug already exists',
          `A cup with slug "${body.slug}" already exists`,
        );
      }
    }
    let updated: Cup | undefined;
    db.write((draft) => {
      const idx = draft.cups.findIndex((c) => c.id === params.id);
      if (idx === -1) return;
      draft.cups[idx] = { ...draft.cups[idx], ...body };
      updated = draft.cups[idx];
    });
    if (!updated) {
      return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    }
    return HttpResponse.json(updated);
  }),

  http.delete('/api/admin/cups/:id', ({ request, params }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    let removed = false;
    db.write((draft) => {
      const idx = draft.cups.findIndex((c) => c.id === params.id);
      if (idx >= 0) {
        draft.cups.splice(idx, 1);
        removed = true;
      }
    });
    if (!removed) {
      return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Cups (public) ---
  http.get('/api/cups/by-slug/:slug', ({ params }) => {
    const cup = db.read().cups.find((c) => c.slug === params.slug);
    if (!cup) {
      return problem(
        404,
        'Not found',
        `Cup with slug "${String(params.slug)}" not found`,
      );
    }
    return HttpResponse.json(cup);
  }),

  // --- Teams (public) ---
  http.get('/api/cups/:id/teams', ({ params }) => {
    const cup = db.read().cups.find((c) => c.id === params.id);
    if (!cup) {
      return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    }
    const teams = db
      .read()
      .teams.filter((t) => t.cupId === cup.id && t.status !== 'cancelled')
      .map<PublicTeam>((t) => ({
        id: t.id,
        name: t.name,
        groupLabel: t.groupLabel,
        status: t.status,
      }));
    return HttpResponse.json(teams);
  }),

  // --- Registration (public) ---
  http.post('/api/cups/:id/registrations', async ({ request, params }) => {
    const cup = db.read().cups.find((c) => c.id === params.id);
    if (!cup) {
      return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    }
    if (cup.status !== 'open') {
      return problem(
        422,
        'Registration not open',
        'Registration is not open for this cup',
      );
    }
    const body = (await request.json()) as Partial<RegistrationCreateRequest>;
    const teamNames = Array.isArray(body.teamNames) ? body.teamNames : [];
    if (teamNames.length < 1 || teamNames.length > 2) {
      return problem(400, 'Validation', 'teamNames must contain 1 or 2 entries');
    }
    const trimmedNames = teamNames.map((n) => n.trim());
    if (trimmedNames.some((n) => n.length === 0)) {
      return problem(400, 'Validation', 'team names cannot be empty');
    }
    if (
      trimmedNames.length === 2 &&
      trimmedNames[0].toLowerCase() === trimmedNames[1].toLowerCase()
    ) {
      return problem(400, 'Validation', 'Team names must differ');
    }
    if (!body.clubName?.trim()) return problem(400, 'Validation', 'clubName is required');
    if (!body.contactName?.trim()) return problem(400, 'Validation', 'contactName is required');
    if (!body.contactEmail || !EMAIL_RE.test(body.contactEmail)) {
      return problem(400, 'Validation', 'contactEmail is invalid');
    }
    if (!body.contactPhone?.trim()) return problem(400, 'Validation', 'contactPhone is required');

    const existingActive = db
      .read()
      .teams.filter((t) => t.cupId === cup.id && t.status !== 'cancelled');
    for (const name of trimmedNames) {
      const collision = existingActive.find(
        (t) => t.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (collision) {
        return HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Slug already exists',
            status: 409,
            detail: `The name "${name}" is already taken — add a number or color to keep teams apart`,
            teamName: name,
          },
          {
            status: 409,
            headers: { 'Content-Type': 'application/problem+json' },
          },
        );
      }
    }
    if (existingActive.length + trimmedNames.length > cup.maxTeams) {
      return problem(422, 'Cup is full', 'No remaining capacity for this cup');
    }

    const registrationId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const newTeams: Team[] = trimmedNames.map((name) => ({
      id: crypto.randomUUID(),
      cupId: cup.id,
      registrationId,
      name,
      clubName: body.clubName!.trim(),
      contactName: body.contactName!.trim(),
      contactEmail: body.contactEmail!.trim(),
      contactPhone: body.contactPhone!.trim(),
      groupLabel: null,
      status: 'reserved',
      createdAt,
      paidAt: null,
      cancelledAt: null,
    }));

    db.write((draft) => {
      draft.teams.push(...newTeams);
      draft.registrations.push({
        id: registrationId,
        cupId: cup.id,
        teamIds: newTeams.map((t) => t.id),
        createdAt,
      });
      const cupIdx = draft.cups.findIndex((c) => c.id === cup.id);
      if (cupIdx >= 0) {
        const activeAfter = draft.teams.filter(
          (t) => t.cupId === cup.id && t.status !== 'cancelled',
        );
        if (activeAfter.length >= draft.cups[cupIdx].maxTeams) {
          draft.cups[cupIdx] = { ...draft.cups[cupIdx], status: 'full' };
        }
      }
    });

    const payload: RegistrationCreateResponse = {
      registrationId,
      teamIds: newTeams.map((t) => t.id),
    };
    return HttpResponse.json(payload, { status: 201 });
  }),

  // --- Teams (admin) ---
  http.get('/api/admin/cups/:id/teams', ({ request, params }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const cup = db.read().cups.find((c) => c.id === params.id);
    if (!cup) {
      return problem(404, 'Not found', `Cup ${String(params.id)} not found`);
    }
    const teams = db
      .read()
      .teams.filter((t) => t.cupId === cup.id)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return HttpResponse.json(teams);
  }),

  http.patch('/api/admin/teams/:id', async ({ request, params }) => {
    const auth = requireAuth(request);
    if (isAuthErr(auth)) return auth.error;
    const body = (await request.json()) as {
      status?: TeamStatus;
      groupLabel?: GroupLabel | null;
    };
    let updated: Team | undefined;
    db.write((draft) => {
      const idx = draft.teams.findIndex((t) => t.id === params.id);
      if (idx === -1) return;
      const team = draft.teams[idx];
      const now = new Date().toISOString();
      const next: Team = { ...team };
      if (body.status !== undefined && body.status !== team.status) {
        next.status = body.status;
        if (body.status === 'paid') {
          next.paidAt = now;
          next.cancelledAt = null;
        } else if (body.status === 'cancelled') {
          next.cancelledAt = now;
        }
      }
      if (body.groupLabel !== undefined) {
        next.groupLabel = body.groupLabel;
      }
      draft.teams[idx] = next;
      updated = next;

      if (
        body.status === 'cancelled' &&
        team.status !== 'cancelled'
      ) {
        const cupIdx = draft.cups.findIndex((c) => c.id === team.cupId);
        if (cupIdx >= 0 && draft.cups[cupIdx].status === 'full') {
          const activeCount = draft.teams.filter(
            (t) => t.cupId === team.cupId && t.status !== 'cancelled',
          ).length;
          if (activeCount < draft.cups[cupIdx].maxTeams) {
            draft.cups[cupIdx] = {
              ...draft.cups[cupIdx],
              status: 'open',
            };
          }
        }
      }
    });
    if (!updated) {
      return problem(404, 'Not found', `Team ${String(params.id)} not found`);
    }
    return HttpResponse.json(updated);
  }),

  http.get('/api/registrations/:id', ({ params }) => {
    const state = db.read();
    const registration = state.registrations.find((r) => r.id === params.id);
    if (!registration) {
      return problem(
        404,
        'Not found',
        `Registration ${String(params.id)} not found`,
      );
    }
    const teams = state.teams
      .filter((t) => t.registrationId === registration.id)
      .map<PublicTeam>((t) => ({
        id: t.id,
        name: t.name,
        groupLabel: t.groupLabel,
        status: t.status,
      }));
    const payload: RegistrationDetail = { registration, teams };
    return HttpResponse.json(payload);
  }),
];
