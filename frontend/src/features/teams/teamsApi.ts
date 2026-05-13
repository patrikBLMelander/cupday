import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type {
  GroupLabel,
  PublicTeam,
  RegistrationCreateRequest,
  RegistrationCreateResponse,
  RegistrationDetail,
  Team,
  TeamStatus,
} from '@/features/teams/teamTypes';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
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
  tagTypes: ['Teams', 'AdminTeams', 'Cup', 'Cups', 'Registration'],
  endpoints: (builder) => ({
    listPublicTeamsByCup: builder.query<PublicTeam[], string>({
      query: (cupId) => `/cups/${cupId}/teams`,
      providesTags: (_result, _err, cupId) => [
        { type: 'Teams' as const, id: cupId },
      ],
    }),
    listAdminTeamsByCup: builder.query<Team[], string>({
      query: (cupId) => `/admin/cups/${cupId}/teams`,
      providesTags: (_result, _err, cupId) => [
        { type: 'AdminTeams' as const, id: cupId },
      ],
    }),
    getRegistration: builder.query<RegistrationDetail, string>({
      query: (id) => `/registrations/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Registration', id }],
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
    updateTeam: builder.mutation<
      Team,
      {
        id: string;
        cupId: string;
        patch: {
          status?: TeamStatus;
          groupLabel?: GroupLabel | null;
          logoUrl?: string;
        };
      }
    >({
      query: ({ id, patch }) => ({
        url: `/admin/teams/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _err, { cupId }) => [
        { type: 'AdminTeams', id: cupId },
        { type: 'Teams', id: cupId },
        { type: 'Cup', id: cupId },
        { type: 'Cups', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListPublicTeamsByCupQuery,
  useListAdminTeamsByCupQuery,
  useGetRegistrationQuery,
  useCreateRegistrationMutation,
  useUpdateTeamMutation,
} = teamsApi;
