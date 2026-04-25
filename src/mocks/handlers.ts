import { http, HttpResponse } from 'msw';

import { db, type MockUser } from '@/mocks/db';

const EMAIL_RE = /^.+@.+\..+$/;
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

type LoginBody = { email?: string; password?: string };
type LoginResponse = { token: string; user: MockUser };
type MeResponse = { user: MockUser };

export const handlers = [
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
    const token = getBearerToken(request);
    if (!token) return problem(401, 'Unauthorized', 'Missing bearer token');
    const state = db.read();
    const session = state.sessions.find((s) => s.token === token);
    if (!session) return problem(401, 'Unauthorized', 'Invalid token');
    const user = state.users.find((u) => u.id === session.userId);
    if (!user) return problem(401, 'Unauthorized', 'User not found');
    const payload: MeResponse = { user };
    return HttpResponse.json(payload);
  }),
];
