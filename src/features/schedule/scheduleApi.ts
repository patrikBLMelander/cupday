import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type {
  Match,
  Pitch,
  ScheduleSettingsRequest,
} from '@/features/schedule/scheduleTypes';

function resolveBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost/api';
}

export const scheduleApi = createApi({
  reducerPath: 'scheduleApi',
  baseQuery: fetchBaseQuery({
    baseUrl: resolveBaseUrl(),
    prepareHeaders: (headers) => {
      if (typeof window !== 'undefined') {
        const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (token) headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  // Cup tags shared with cupsApi so generation invalidates the cup cache
  // when the status auto-transitions to 'scheduled'.
  tagTypes: ['Matches', 'Cup', 'Cups'],
  endpoints: (builder) => ({
    listMatchesByCup: builder.query<Match[], string>({
      query: (cupId) => `/cups/${cupId}/matches`,
      providesTags: (_result, _err, cupId) => [
        { type: 'Matches' as const, id: cupId },
      ],
    }),
    generateSchedule: builder.mutation<
      Match[],
      { cupId: string; settings: ScheduleSettingsRequest }
    >({
      query: ({ cupId, settings }) => ({
        url: `/admin/cups/${cupId}/schedule/generate`,
        method: 'POST',
        body: settings,
      }),
      invalidatesTags: (_result, _err, { cupId }) => [
        { type: 'Matches', id: cupId },
        { type: 'Cup', id: cupId },
        { type: 'Cups', id: 'LIST' },
      ],
    }),
    updateMatch: builder.mutation<
      Match,
      {
        id: string;
        cupId: string;
        patch: { startTime?: string; pitch?: Pitch };
      }
    >({
      query: ({ id, patch }) => ({
        url: `/admin/matches/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _err, { cupId }) => [
        { type: 'Matches', id: cupId },
      ],
    }),
  }),
});

export const {
  useListMatchesByCupQuery,
  useGenerateScheduleMutation,
  useUpdateMatchMutation,
} = scheduleApi;
