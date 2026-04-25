import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type {
  PublicTeam,
  RegistrationCreateRequest,
  RegistrationCreateResponse,
} from '@/features/teams/teamTypes';

function resolveBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost/api';
}

export const teamsApi = createApi({
  reducerPath: 'teamsApi',
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
  // Cup tags are shared with cupsApi so creating a registration invalidates
  // the cup cache (status may auto-transition to 'full' on the server).
  tagTypes: ['Teams', 'Cup', 'Cups'],
  endpoints: (builder) => ({
    listPublicTeamsByCup: builder.query<PublicTeam[], string>({
      query: (cupId) => `/cups/${cupId}/teams`,
      providesTags: (_result, _err, cupId) => [
        { type: 'Teams' as const, id: cupId },
      ],
    }),
    createRegistration: builder.mutation<
      RegistrationCreateResponse,
      { cupId: string; body: RegistrationCreateRequest }
    >({
      query: ({ cupId, body }) => ({
        url: `/cups/${cupId}/registrations`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { cupId }) => [
        { type: 'Teams', id: cupId },
        { type: 'Cup', id: cupId },
        { type: 'Cups', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListPublicTeamsByCupQuery,
  useCreateRegistrationMutation,
} = teamsApi;
