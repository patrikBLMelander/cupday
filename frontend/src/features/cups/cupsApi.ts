import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { TOKEN_STORAGE_KEY } from '@/features/auth/authSlice';
import type {
  Cup,
  CupCreateRequest,
  CupUpdateRequest,
} from '@/features/cups/cupTypes';

function resolveBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  if (configured) return configured;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/api`;
  }
  return 'http://localhost/api';
}

export const cupsApi = createApi({
  reducerPath: 'cupsApi',
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
  tagTypes: ['Cups', 'Cup', 'PublicCups'],
  endpoints: (builder) => ({
    listCups: builder.query<Cup[], void>({
      query: () => '/admin/cups',
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: 'Cup' as const, id: c.id })),
              { type: 'Cups' as const, id: 'LIST' },
            ]
          : [{ type: 'Cups' as const, id: 'LIST' }],
    }),
    listPublicCups: builder.query<Cup[], void>({
      query: () => '/cups/public',
      providesTags: [{ type: 'PublicCups', id: 'LIST' }],
    }),
    getCup: builder.query<Cup, string>({
      query: (id) => `/admin/cups/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Cup', id }],
    }),
    getCupBySlug: builder.query<Cup, string>({
      query: (slug) => `/cups/by-slug/${slug}`,
      providesTags: (_result, _err, slug) => [
        { type: 'Cup', id: `slug:${slug}` },
      ],
    }),
    createCup: builder.mutation<Cup, CupCreateRequest>({
      query: (body) => ({ url: '/admin/cups', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Cups', id: 'LIST' },
        { type: 'PublicCups', id: 'LIST' },
      ],
    }),
    updateCup: builder.mutation<Cup, { id: string } & CupUpdateRequest>({
      query: ({ id, ...patch }) => ({
        url: `/admin/cups/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Cup', id },
        { type: 'Cups', id: 'LIST' },
        { type: 'PublicCups', id: 'LIST' },
      ],
    }),
    deleteCup: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin/cups/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Cups', id: 'LIST' },
        { type: 'PublicCups', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useListCupsQuery,
  useListPublicCupsQuery,
  useGetCupQuery,
  useGetCupBySlugQuery,
  useCreateCupMutation,
  useUpdateCupMutation,
  useDeleteCupMutation,
} = cupsApi;
