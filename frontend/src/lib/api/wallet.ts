import type { WalletResponse } from './types'
import { API_URL, parseError } from './index'

export async function createWallet(token: string) {
  const res = await fetch(`${API_URL}/wallets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 409) return null
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<WalletResponse>
}

export async function getMyWallet(token: string) {
  const res = await fetch(`${API_URL}/wallets/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<WalletResponse>
}
