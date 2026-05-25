import { create } from 'zustand'

export type GamePhase = 'IDLE' | 'BETTING' | 'RUNNING' | 'CRASHED'

export interface RoundInfo {
  id: string
  status: GamePhase
  serverSeedHash: string
  clientSeed: string
  nonce: number
  bettingEndsAt: string
  startedAt: string | null
  crashedAt?: string | null
  crashPoint?: number | null
  serverSeed?: string | null
}

export interface BetInfo {
  id?: string
  roundId?: string
  playerId: string
  amountInCents: string
  status?: string
  cashoutMultiplier?: number | null
  payoutInCents?: string | null
}

interface GameState {
  phase: GamePhase
  currentRound: RoundInfo | null
  multiplier: number
  elapsedMs: number
  bettingEndsAt: Date | null
  serverSeedHash: string | null
  serverSeed: string | null
  crashPoint: number | null
  bets: BetInfo[]
  myBet: BetInfo | null
  connected: boolean

  syncFromServer: (payload: { round: RoundInfo; bets: BetInfo[] }) => void
  onBettingStarted: (payload: { roundId: string; bettingEndsAt: string; serverSeedHash: string }) => void
  onRoundStarted: (payload: { roundId: string; startedAt: string }) => void
  onTick: (payload: { roundId: string; multiplier: number; elapsedMs: number }) => void
  onCrashed: (payload: { roundId: string; crashPoint: number; serverSeed: string }) => void
  onBetPlaced: (payload: { roundId: string; playerId: string; amountInCents: string }) => void
  onBetCashedOut: (payload: { roundId: string; playerId: string; multiplier: number; payoutInCents: string }) => void
  setConnected: (connected: boolean) => void
  setMyBet: (bet: BetInfo | null) => void
  clearMyBet: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'IDLE',
  currentRound: null,
  multiplier: 1,
  elapsedMs: 0,
  bettingEndsAt: null,
  serverSeedHash: null,
  serverSeed: null,
  crashPoint: null,
  bets: [],
  myBet: null,
  connected: false,

  syncFromServer: ({ round, bets }) => {
    const phase = round.status as GamePhase
    const elapsedMs = round.startedAt
      ? Date.now() - new Date(round.startedAt).getTime()
      : 0
    const multiplier = phase === 'RUNNING' && round.startedAt
      ? Math.pow(1.0024, elapsedMs / 100)
      : 1

    set({
      phase,
      currentRound: round,
      multiplier,
      elapsedMs,
      bettingEndsAt: new Date(round.bettingEndsAt),
      serverSeedHash: round.serverSeedHash,
      bets,
    })
  },

  onBettingStarted: ({ bettingEndsAt, serverSeedHash }) => {
    set({
      phase: 'BETTING',
      multiplier: 1,
      elapsedMs: 0,
      bets: [],
      myBet: null,
      crashPoint: null,
      serverSeed: null,
      bettingEndsAt: new Date(bettingEndsAt),
      serverSeedHash,
    })
  },

  onRoundStarted: ({ startedAt }) => {
    set((s) => ({
      phase: 'RUNNING',
      currentRound: s.currentRound
        ? { ...s.currentRound, startedAt, status: 'RUNNING' }
        : s.currentRound,
      multiplier: 1,
      elapsedMs: 0,
    }))
  },

  onTick: ({ multiplier, elapsedMs }) => {
    set({ multiplier, elapsedMs })
  },

  onCrashed: ({ crashPoint, serverSeed }) => {
    set((s) => ({
      phase: 'CRASHED',
      crashPoint,
      serverSeed,
      multiplier: crashPoint,
      myBet: s.myBet?.status === 'CONFIRMED' || s.myBet?.status === 'PENDING'
        ? { ...s.myBet, status: 'LOST' }
        : s.myBet,
    }))
  },

  onBetPlaced: ({ playerId, amountInCents }) => {
    const newBet: BetInfo = { playerId, amountInCents, status: 'PENDING' }
    set((s) => ({ bets: [...s.bets, newBet] }))
  },

  onBetCashedOut: ({ playerId, multiplier, payoutInCents }) => {
    set((s) => ({
      bets: s.bets.map((b) =>
        b.playerId === playerId
          ? { ...b, status: 'CASHED_OUT', cashoutMultiplier: multiplier, payoutInCents }
          : b,
      ),
      myBet:
        s.myBet?.playerId === playerId
          ? { ...s.myBet, status: 'CASHED_OUT', cashoutMultiplier: multiplier, payoutInCents }
          : s.myBet,
    }))
  },

  setConnected: (connected) => set({ connected }),
  setMyBet: (bet) => set({ myBet: bet }),
  clearMyBet: () => set({ myBet: null }),
}))
