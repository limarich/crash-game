import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { keycloakLogin, createWallet, getMyWallet } from '#/lib/api'

interface AuthState {
  token: string | null
  username: string | null
  balanceInCents: bigint
  loading: boolean
  error: string | null

  login: (username: string, password: string) => Promise<void>
  logout: () => void
  refreshBalance: () => Promise<void>
  setBalance: (cents: bigint) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      username: null,
      balanceInCents: 0n,
      loading: false,
      error: null,

      login: async (username, password) => {
        set({ loading: true, error: null })
        try {
          const tokens = await keycloakLogin(username, password)
          set({ token: tokens.access_token, username, loading: false })

          // ensure wallet exists then fetch balance
          await createWallet(tokens.access_token)
          const wallet = await getMyWallet(tokens.access_token)
          set({ balanceInCents: BigInt(wallet.balanceInCents) })
        } catch (err) {
          set({ loading: false, error: err instanceof Error ? err.message : 'Login failed' })
          throw err
        }
      },

      logout: () => set({ token: null, username: null, balanceInCents: 0n, error: null }),

      refreshBalance: async () => {
        const { token } = get()
        if (!token) return
        try {
          const wallet = await getMyWallet(token)
          set({ balanceInCents: BigInt(wallet.balanceInCents) })
        } catch {
          // TODO: handle error
        }
      },

      setBalance: (cents) => set({ balanceInCents: cents }),
    }),
    {
      name: 'auth',
      partialize: (s) => ({ token: s.token, username: s.username }),
    },
  ),
)
