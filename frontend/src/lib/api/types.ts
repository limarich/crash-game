export interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface BetResponse {
  id: string
  roundId: string
  playerId: string
  amountInCents: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CASHED_OUT' | 'LOST'
  cashoutMultiplier: number | null
  payoutInCents: string | null
  createdAt: string
}

export interface RoundResponse {
  id: string
  status: 'BETTING' | 'RUNNING' | 'CRASHED'
  serverSeedHash: string
  clientSeed: string
  nonce: number
  bettingEndsAt: string
  startedAt: string | null
  crashedAt: string | null
  createdAt: string
  crashPoint: number | null
  serverSeed: string | null
  bets?: BetResponse[]
}

export interface VerifyChain {
  nextRoundId: string
  nextServerSeedHash: string
  chainValid: boolean
}

export interface VerifyResponse {
  roundId: string
  serverSeed: string | null
  serverSeedHash: string
  clientSeed: string
  nonce: number
  crashPoint: number | null
  verified: boolean
  chain: VerifyChain | null
}

export interface LeaderboardEntry {
  playerId: string
  playerName: string
  netProfitInCents: string
}

export interface WalletResponse {
  id: string
  playerId: string
  balanceInCents: string
}
