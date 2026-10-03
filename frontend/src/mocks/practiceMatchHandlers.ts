import { http, HttpResponse } from 'msw';

import type {
  Booking,
  BookingRequest,
  CreateBookingResponse,
  CreatePracticeMatchResponse,
  ManagedPracticeMatch,
  PracticeMatch,
  PracticeMatchRequest,
} from '@/features/practiceMatches/practiceMatchTypes';
import { db, type MockBooking, type MockPracticeMatch } from '@/mocks/db';

const BASE = '/api/practice-matches';
const TOKEN_HEADER = 'X-Manage-Token';
const EMAIL_RE = /^.+@.+\..+$/;
const ALLOWED_PLAYERS: ReadonlySet<number> = new Set([5, 7, 9, 11]);

function problem(status: number, title: string, detail: string, extra: Record<string, unknown> = {}): Response {
  return HttpResponse.json(
    { type: 'about:blank', title, status, detail, ...extra },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function activeBookings(matchId: string): MockBooking[] {
  return db.read().practiceBookings.filter((b) => b.matchId === matchId && b.status === 'booked');
}

function toPublic(row: MockPracticeMatch): PracticeMatch {
  const { manageToken: _token, ...match } = row;
  const booked = activeBookings(row.id);
  return {
    ...match,
    freeSlots: Math.max(0, row.opponentSlots - booked.length),
    bookedTeams: booked.map((b) => b.teamName),
  };
}

function toBooking(row: MockBooking): Booking {
  const { manageToken: _token, ...booking } = row;
  return booking;
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

function validateMatch(body: Partial<PracticeMatchRequest>): Response | null {
  const required = ['teamName', 'venue', 'contactName', 'contactPhone', 'contactEmail'] as const;
  const missing = required.find((field) => isBlank(body[field]));
  if (missing) return problem(400, 'Validation', `${missing} is required`);
  if (!EMAIL_RE.test(body.contactEmail ?? '')) return problem(400, 'Validation', 'contactEmail is invalid');
  if (!body.gender || !body.birthYear) return problem(400, 'Validation', 'gender and birthYear are required');
  if (!body.level || body.level < 1 || body.level > 9) return problem(400, 'Validation', 'level must be 1-9');
  if (!ALLOWED_PLAYERS.has(body.playersPerSide ?? 0)) return problem(400, 'Validation', 'invalid playersPerSide');
  if (!body.kickoffAt || new Date(body.kickoffAt).getTime() <= Date.now()) {
    return problem(400, 'Validation', 'kickoffAt must be in the future');
  }
  if (!body.opponentSlots || body.opponentSlots < 1 || body.opponentSlots > 5) {
    return problem(400, 'Validation', 'opponentSlots must be 1-5');
  }
  if (body.costSek != null && body.costSek < 0) return problem(400, 'Validation', 'costSek must be >= 0');
  if (!isBlank(body.website)) return problem(400, 'Validation', 'Request rejected');
  return null;
}

function applyRequest(body: PracticeMatchRequest): Omit<PracticeMatch, 'id' | 'freeSlots' | 'bookedTeams' | 'status' | 'createdAt'> {
  return {
    teamName: body.teamName.trim(),
    gender: body.gender,
    birthYear: body.birthYear,
    level: body.level,
    playersPerSide: body.playersPerSide,
    kickoffAt: body.kickoffAt,
    venue: body.venue.trim(),
    opponentSlots: body.opponentSlots,
    contactName: body.contactName.trim(),
    contactPhone: body.contactPhone.trim(),
    contactEmail: body.contactEmail.trim(),
    costSek: body.costSek ?? null,
    notes: body.notes?.trim() ? body.notes.trim() : null,
  };
}

function findMatch(id: string): MockPracticeMatch | undefined {
  return db.read().practiceMatches.find((m) => m.id === id);
}

export const practiceMatchHandlers = [
  http.get(BASE, ({ request }) => {
    const url = new URL(request.url);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const start = from ? new Date(from).getTime() : Date.now();
    const end = to ? new Date(to).getTime() : start + 60 * 24 * 60 * 60 * 1000;
    const rows = db
      .read()
      .practiceMatches.filter((m) => {
        const kickoff = new Date(m.kickoffAt).getTime();
        return m.status === 'active' && kickoff >= Math.max(start, Date.now()) && kickoff < end;
      })
      .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt))
      .map(toPublic);
    return HttpResponse.json(rows);
  }),

  http.get(`${BASE}/:id`, ({ params }) => {
    const row = findMatch(String(params.id));
    if (!row) return problem(404, 'Not found', 'Practice match not found');
    return HttpResponse.json(toPublic(row));
  }),

  http.get(`${BASE}/:id/manage`, ({ params, request }) => {
    const row = findMatch(String(params.id));
    if (!row) return problem(404, 'Not found', 'Practice match not found');
    if (request.headers.get(TOKEN_HEADER) !== row.manageToken) return problem(403, 'Forbidden', 'Invalid manage token');
    const bookings = db.read().practiceBookings.filter((b) => b.matchId === row.id).map(toBooking);
    const payload: ManagedPracticeMatch = { match: toPublic(row), bookings };
    return HttpResponse.json(payload);
  }),

  http.post(BASE, async ({ request }) => {
    const body = (await request.json()) as PracticeMatchRequest;
    const invalid = validateMatch(body);
    if (invalid) return invalid;
    const row: MockPracticeMatch = {
      id: crypto.randomUUID(),
      ...applyRequest(body),
      freeSlots: body.opponentSlots,
      bookedTeams: [],
      status: 'active',
      createdAt: new Date().toISOString(),
      manageToken: crypto.randomUUID(),
    };
    db.write((draft) => {
      draft.practiceMatches.push(row);
    });
    const payload: CreatePracticeMatchResponse = { match: toPublic(row), manageToken: row.manageToken };
    return HttpResponse.json(payload, { status: 201 });
  }),

  http.put(`${BASE}/:id`, async ({ params, request }) => {
    const row = findMatch(String(params.id));
    if (!row) return problem(404, 'Not found', 'Practice match not found');
    if (request.headers.get(TOKEN_HEADER) !== row.manageToken) return problem(403, 'Forbidden', 'Invalid manage token');
    const body = (await request.json()) as PracticeMatchRequest;
    const invalid = validateMatch(body);
    if (invalid) return invalid;
    if (body.opponentSlots < activeBookings(row.id).length) {
      return problem(400, 'Validation', 'opponentSlots cannot be lower than the number of bookings');
    }
    db.write((draft) => {
      const target = draft.practiceMatches.find((m) => m.id === row.id);
      if (target) Object.assign(target, applyRequest(body));
    });
    return HttpResponse.json(toPublic(findMatch(row.id)!));
  }),

  http.delete(`${BASE}/:id`, ({ params, request }) => {
    const row = findMatch(String(params.id));
    if (!row) return problem(404, 'Not found', 'Practice match not found');
    if (request.headers.get(TOKEN_HEADER) !== row.manageToken) return problem(403, 'Forbidden', 'Invalid manage token');
    db.write((draft) => {
      const target = draft.practiceMatches.find((m) => m.id === row.id);
      if (target) target.status = 'cancelled';
    });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/:id/bookings`, async ({ params, request }) => {
    const row = findMatch(String(params.id));
    if (!row) return problem(404, 'Not found', 'Practice match not found');
    const body = (await request.json()) as BookingRequest;
    const required = ['teamName', 'contactName', 'contactPhone', 'contactEmail'] as const;
    const missing = required.find((field) => isBlank(body[field]));
    if (missing) return problem(400, 'Validation', `${missing} is required`);
    if (row.status !== 'active' || new Date(row.kickoffAt).getTime() <= Date.now()) {
      return problem(422, 'Match not bookable', 'This match can no longer be booked');
    }
    const booked = activeBookings(row.id);
    if (booked.length >= row.opponentSlots) return problem(422, 'Match is full', 'All slots are taken');
    const teamName = body.teamName.trim();
    if (booked.some((b) => b.teamName.toLowerCase() === teamName.toLowerCase())) {
      return problem(409, 'Team already booked', 'Team already booked', { teamName });
    }
    const booking: MockBooking = {
      id: crypto.randomUUID(),
      matchId: row.id,
      teamName,
      contactName: body.contactName.trim(),
      contactPhone: body.contactPhone.trim(),
      contactEmail: body.contactEmail.trim(),
      message: body.message?.trim() ? body.message.trim() : null,
      status: 'booked',
      createdAt: new Date().toISOString(),
      cancelledAt: null,
      manageToken: crypto.randomUUID(),
    };
    db.write((draft) => {
      draft.practiceBookings.push(booking);
    });
    const payload: CreateBookingResponse = { booking: toBooking(booking), manageToken: booking.manageToken };
    return HttpResponse.json(payload, { status: 201 });
  }),

  http.delete(`${BASE}/:id/bookings/:bookingId`, ({ params, request }) => {
    const row = findMatch(String(params.id));
    const booking = db.read().practiceBookings.find((b) => b.id === params.bookingId && b.matchId === params.id);
    if (!row || !booking) return problem(404, 'Not found', 'Booking not found');
    const token = request.headers.get(TOKEN_HEADER);
    if (token !== booking.manageToken && token !== row.manageToken) {
      return problem(403, 'Forbidden', 'Invalid manage token');
    }
    db.write((draft) => {
      const target = draft.practiceBookings.find((b) => b.id === booking.id);
      if (target && target.status === 'booked') {
        target.status = 'cancelled';
        target.cancelledAt = new Date().toISOString();
      }
    });
    return new HttpResponse(null, { status: 204 });
  }),
];
