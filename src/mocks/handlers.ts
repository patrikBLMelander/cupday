import { http, HttpResponse } from 'msw';

import type {
  Cup,
  CupCreateRequest,
  CupUpdateRequest,
} from '@/features/cups/cupTypes';
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
];
