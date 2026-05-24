import { Round } from './round.entity'

export interface IRoundRepository {
    findCurrent(): Promise<Round | null>
    findById(id: string): Promise<Round | null>
    findByNonce(nonce: number): Promise<Round | null>
    findHistory(page: number, limit: number): Promise<Round[]>
    save(round: Round): Promise<void>
}