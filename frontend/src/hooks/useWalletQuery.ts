import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '#/store/auth.store'
import { getMyWallet } from '#/lib/api'

export const walletKeys = {
  me: (token: string) => ['wallet', token],
}

export function useWalletQuery() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: walletKeys.me(token ?? ''),
    queryFn: () => getMyWallet(token!),
    enabled: !!token,
    staleTime: 10_000,
  })
}

export function useInvalidateWallet() {
  const queryClient = useQueryClient()
  const token = useAuthStore((s) => s.token)

  return () => queryClient.invalidateQueries({ queryKey: walletKeys.me(token ?? '') })
}
