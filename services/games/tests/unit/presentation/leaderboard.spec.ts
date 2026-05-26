import { describe, it, expect, mock } from 'bun:test'
import { GamesController } from '../../../src/presentation/controllers/games.controller'
import type { IBetRepository } from '../../../src/domain/bet/bet.interface'

const makeEntry = (overrides?: Partial<{ playerId: string; playerName: string; netProfitInCents: bigint }>) => ({
    playerId: overrides?.playerId ?? 'uuid-player-1',
    playerName: overrides?.playerName ?? 'player1',
    netProfitInCents: overrides?.netProfitInCents ?? 5000n,
})

const makeMockBetRepository = (entries: ReturnType<typeof makeEntry>[] = []): IBetRepository => ({
    findLeaderboard: mock(() => Promise.resolve(entries)),
    findById: mock(() => Promise.resolve(null)),
    findByRoundId: mock(() => Promise.resolve([])),
    findByPlayerAndRound: mock(() => Promise.resolve(null)),
    findByPlayerAndRoundWithLock: mock(() => Promise.resolve(null)),
    findByPlayer: mock(() => Promise.resolve([])),
    save: mock(() => Promise.resolve()),
})

describe('GamesController.getLeaderboard', () => {
    it('should return entries with playerName serialized as string', async () => {
        const betRepository = makeMockBetRepository([
            makeEntry({ playerName: 'alice', netProfitInCents: 10_000n }),
        ])
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        const result = await controller.getLeaderboard('10')

        expect(result).toHaveLength(1)
        expect(result[0].playerName).toBe('alice')
        expect(result[0].netProfitInCents).toBe('10000')
    })

    it('should include playerId alongside playerName', async () => {
        const betRepository = makeMockBetRepository([
            makeEntry({ playerId: 'uuid-abc', playerName: 'bob' }),
        ])
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        const result = await controller.getLeaderboard('10')

        expect(result[0].playerId).toBe('uuid-abc')
        expect(result[0].playerName).toBe('bob')
    })

    it('should serialize negative netProfitInCents correctly', async () => {
        const betRepository = makeMockBetRepository([
            makeEntry({ netProfitInCents: -3500n }),
        ])
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        const result = await controller.getLeaderboard('10')

        expect(result[0].netProfitInCents).toBe('-3500')
    })

    it('should clamp limit to 50 maximum', async () => {
        const betRepository = makeMockBetRepository()
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        await controller.getLeaderboard('999')

        expect(betRepository.findLeaderboard).toHaveBeenCalledWith(50)
    })

    it('should clamp limit to 1 minimum', async () => {
        const betRepository = makeMockBetRepository()
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        await controller.getLeaderboard('0')

        expect(betRepository.findLeaderboard).toHaveBeenCalledWith(1)
    })

    it('should default to 10 when limit is not provided', async () => {
        const betRepository = makeMockBetRepository()
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        await controller.getLeaderboard('10')

        expect(betRepository.findLeaderboard).toHaveBeenCalledWith(10)
    })

    it('should preserve repository ordering', async () => {
        const betRepository = makeMockBetRepository([
            makeEntry({ playerName: 'top', netProfitInCents: 9000n }),
            makeEntry({ playerName: 'mid', netProfitInCents: 3000n }),
            makeEntry({ playerName: 'low', netProfitInCents: 100n }),
        ])
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        const result = await controller.getLeaderboard('10')

        expect(result.map(e => e.playerName)).toEqual(['top', 'mid', 'low'])
    })

    it('should return an empty array when there are no entries', async () => {
        const betRepository = makeMockBetRepository([])
        const controller = new GamesController(null as any, betRepository, null as any, null as any, null as any)

        const result = await controller.getLeaderboard('10')

        expect(result).toHaveLength(0)
    })
})
