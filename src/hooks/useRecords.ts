import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getHistory, getRanking, submitMatch } from '../api/client';
import type { MatchRecord } from '../api/contracts';
import { removePendingRecord } from '../api/pending';

export function useRanking(page: number, compatibility: string) {
  return useQuery({
    queryKey: ['ranking', compatibility, page],
    queryFn: () => getRanking(page, compatibility),
    placeholderData: keepPreviousData,
  });
}

export function useHistory(page: number, playerId: string) {
  return useQuery({
    queryKey: ['history', playerId, page],
    queryFn: () => getHistory(page, playerId),
    placeholderData: keepPreviousData,
  });
}

export function useSubmitMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['submit-match'],
    mutationFn: (record: MatchRecord) => submitMatch(record),
    onSuccess: async (record) => {
      removePendingRecord(record.matchId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ranking'] }),
        queryClient.invalidateQueries({ queryKey: ['history'] }),
      ]);
    },
  });
}

