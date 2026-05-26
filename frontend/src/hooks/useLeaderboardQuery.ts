import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getLeaderboard } from '#/lib/api'

export const leaderboardKeys = {
  top: (limit: number) => ['leaderboard', limit],
}

export function useLeaderboardQuery(limit = 10) {
  return useQuery({
    queryKey: leaderboardKeys.top(limit),
    queryFn: () => getLeaderboard(limit),
    staleTime: 30_000,
  })
}

export function useInvalidateLeaderboard() {
  const queryClient = useQueryClient()
  return (limit = 10) => queryClient.invalidateQueries({ queryKey: leaderboardKeys.top(limit) })
}
