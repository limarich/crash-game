import { Bet } from './bet.entity'

export interface IBetRepository {
    findById(id: string): Promise<Bet | null>
    findByRoundId(roundId: string): Promise<Bet[]>
    findByPlayerAndRound(playerId: string, roundId: string): Promise<Bet | null>
    findByPlayer(playerId: string, page: number, limit: number): Promise<Bet[]>
    save(bet: Bet): Promise<void>

    // to avoid race condition
    findByPlayerAndRoundWithLock(playerId: string, roundId: string): Promise<Bet | null>
}