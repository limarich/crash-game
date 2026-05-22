import { IBetRepository } from "@/domain/bet/bet.interface"
import { Bet } from "@/domain/bet/bet.entity"

export class BetRepository implements IBetRepository {
    findByRoundId(roundId: string): Promise<Bet[]> {
        throw new Error("Method not implemented.")
    }
    findByPlayerAndRound(playerId: string, roundId: string): Promise<Bet | null> {
        throw new Error("Method not implemented.")
    }
    findByPlayer(playerId: string, page: number, limit: number): Promise<Bet[]> {
        throw new Error("Method not implemented.")
    }
    save(bet: Bet): Promise<void> {
        throw new Error("Method not implemented.")
    }

}