import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type {
  BookingRequest,
  CreateBookingResponse,
  CreatePracticeMatchResponse,
  ManagedPracticeMatch,
  PracticeMatch,
  PracticeMatchRequest,
} from '@/features/practiceMatches/practiceMatchTypes';

export const MANAGE_TOKEN_HEADER = 'X-Manage-Token';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost/api';
}

type ManageArgs = { id: string; token: string };

export const practiceMatchesApi = createApi({
  reducerPath: 'practiceMatchesApi',
  baseQuery: fetchBaseQuery({ baseUrl: resolveBaseUrl() }),
  tagTypes: ['PracticeMatches', 'PracticeMatch', 'ManagedPracticeMatch'],
  endpoints: (builder) => ({
    listPracticeMatches: builder.query<PracticeMatch[], void>({
      query: () => '/practice-matches',
      providesTags: [{ type: 'PracticeMatches', id: 'LIST' }],
    }),
    getPracticeMatch: builder.query<PracticeMatch, string>({
      query: (id) => `/practice-matches/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'PracticeMatch', id }],
    }),
    getManagedPracticeMatch: builder.query<ManagedPracticeMatch, ManageArgs>({
      query: ({ id, token }) => ({
        url: `/practice-matches/${id}/manage`,
        headers: { [MANAGE_TOKEN_HEADER]: token },
      }),
      providesTags: (_result, _err, { id }) => [{ type: 'ManagedPracticeMatch', id }],
    }),
    createPracticeMatch: builder.mutation<CreatePracticeMatchResponse, PracticeMatchRequest>({
      query: (body) => ({ url: '/practice-matches', method: 'POST', body }),
      invalidatesTags: [{ type: 'PracticeMatches', id: 'LIST' }],
    }),
    updatePracticeMatch: builder.mutation<
      PracticeMatch,
      ManageArgs & { body: PracticeMatchRequest }
    >({
      query: ({ id, token, body }) => ({
        url: `/practice-matches/${id}`,
        method: 'PUT',
        body,
        headers: { [MANAGE_TOKEN_HEADER]: token },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'PracticeMatches', id: 'LIST' },
        { type: 'PracticeMatch', id },
        { type: 'ManagedPracticeMatch', id },
      ],
    }),
    cancelPracticeMatch: builder.mutation<void, ManageArgs>({
      query: ({ id, token }) => ({
        url: `/practice-matches/${id}`,
        method: 'DELETE',
        headers: { [MANAGE_TOKEN_HEADER]: token },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'PracticeMatches', id: 'LIST' },
        { type: 'PracticeMatch', id },
        { type: 'ManagedPracticeMatch', id },
      ],
    }),
    bookPracticeMatch: builder.mutation<CreateBookingResponse, { id: string; body: BookingRequest }>({
      query: ({ id, body }) => ({ url: `/practice-matches/${id}/bookings`, method: 'POST', body }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'PracticeMatches', id: 'LIST' },
        { type: 'PracticeMatch', id },
        { type: 'ManagedPracticeMatch', id },
      ],
    }),
    cancelBooking: builder.mutation<void, { matchId: string; bookingId: string; token: string }>({
      query: ({ matchId, bookingId, token }) => ({
        url: `/practice-matches/${matchId}/bookings/${bookingId}`,
        method: 'DELETE',
        headers: { [MANAGE_TOKEN_HEADER]: token },
      }),
      invalidatesTags: (_result, _err, { matchId }) => [
        { type: 'PracticeMatches', id: 'LIST' },
        { type: 'PracticeMatch', id: matchId },
        { type: 'ManagedPracticeMatch', id: matchId },
      ],
    }),
  }),
});

export const {
  useListPracticeMatchesQuery,
  useGetPracticeMatchQuery,
  useGetManagedPracticeMatchQuery,
  useCreatePracticeMatchMutation,
  useUpdatePracticeMatchMutation,
  useCancelPracticeMatchMutation,
  useBookPracticeMatchMutation,
  useCancelBookingMutation,
} = practiceMatchesApi;
