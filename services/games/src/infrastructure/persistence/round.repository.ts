import { IRoundRepository } from "../../domain/round/round.interface"
import { Round } from "../../domain/round/round.entity"

export class RoundRepository implements IRoundRepository {
    findCurrent(): Promise<Round | null> {
        throw new Error("Method not implemented.")
    }
    findById(id: string): Promise<Round | null> {
        throw new Error("Method not implemented.")
    }
    findHistory(page: number, limit: number): Promise<Round[]> {
        throw new Error("Method not implemented.")
    }
    save(round: Round): Promise<void> {
        throw new Error("Method not implemented.")
    }
}