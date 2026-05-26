import type { BetResponse, RoundResponse, VerifyResponse } from './types'
import { API_URL, parseError } from './index'

export async function placeBet(amountInCents: number, token: string) {
  const res = await fetch(`${API_URL}/games/bet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amountInCents: String(amountInCents) }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BetResponse>
}

export async function cashout(token: string) {
  const res = await fetch(`${API_URL}/games/bet/cashout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<BetResponse>
}

export async function getRoundHistory(page = 1, limit = 20) {
  const res = await fetch(`${API_URL}/games/rounds/history?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<RoundResponse[]>
}

export async function verifyRound(roundId: string) {
  const res = await fetch(`${API_URL}/games/rounds/${roundId}/verify`)
  if (!res.ok) throw new Error(await parseError(res))
  return res.json() as Promise<VerifyResponse>
}
