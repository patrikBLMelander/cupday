import { cupsApi } from '@/features/cups/cupsApi';
import type { Cup } from '@/features/cups/cupTypes';
import type {
  CreatePostedCupResponse,
  ManageCupArgs,
  ManagedCup,
  PostedCupRequest,
  SettableTeamStatus,
} from '@/features/postedCups/postedCupTypes';
import type { Team } from '@/features/teams/teamTypes';

const TOKEN_HEADER = 'X-Manage-Token';

/** Cups posted without an account, managed with the secret manage token. Shares the cups cache. */
export const postedCupsApi = cupsApi.enhanceEndpoints({ addTagTypes: ['ManagedCup'] }).injectEndpoints({
  endpoints: (builder) => ({
    createPostedCup: builder.mutation<CreatePostedCupResponse, PostedCupRequest>({
      query: (body) => ({ url: '/cups', method: 'POST', body }),
      invalidatesTags: [{ type: 'PublicCups', id: 'LIST' }, 'PublicCups'],
    }),
    getManagedCup: builder.query<ManagedCup, ManageCupArgs>({
      query: ({ id, token }) => ({ url: `/cups/${id}/manage`, headers: { [TOKEN_HEADER]: token } }),
      providesTags: (_result, _err, { id }) => [{ type: 'ManagedCup', id }],
    }),
    updatePostedCup: builder.mutation<Cup, ManageCupArgs & { body: PostedCupRequest }>({
      query: ({ id, token, body }) => ({
        url: `/cups/${id}/manage`,
        method: 'PUT',
        body,
        headers: { [TOKEN_HEADER]: token },
      }),
      invalidatesTags: (_result, _err, { id }) => [{ type: 'ManagedCup', id }, 'PublicCups', 'Cup'],
    }),
    deletePostedCup: builder.mutation<void, ManageCupArgs>({
      query: ({ id, token }) => ({ url: `/cups/${id}/manage`, method: 'DELETE', headers: { [TOKEN_HEADER]: token } }),
      invalidatesTags: ['PublicCups', 'Cup'],
    }),
    setPostedCupTeamStatus: builder.mutation<Team, ManageCupArgs & { teamId: string; status: SettableTeamStatus }>({
      query: ({ id, token, teamId, status }) => ({
        url: `/cups/${id}/manage/teams/${teamId}`,
        method: 'PATCH',
        body: { status },
        headers: { [TOKEN_HEADER]: token },
      }),
      // Optimistic toggle so the "Betald" switch reacts instantly.
      async onQueryStarted({ id, token, teamId, status }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          postedCupsApi.util.updateQueryData('getManagedCup', { id, token }, (draft) => {
            const team = draft.teams.find((t) => t.id === teamId);
            if (team) team.status = status;
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: ['PublicCups', 'Cup'],
    }),
  }),
});

export const {
  useCreatePostedCupMutation,
  useGetManagedCupQuery,
  useUpdatePostedCupMutation,
  useDeletePostedCupMutation,
  useSetPostedCupTeamStatusMutation,
} = postedCupsApi;
