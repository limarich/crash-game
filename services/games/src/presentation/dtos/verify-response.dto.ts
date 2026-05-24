export interface VerifyChainDto {
    nextRoundId: string
    nextServerSeedHash: string
    chainValid: boolean
}

export class VerifyResponseDto {
    roundId: string
    serverSeed: string | null
    serverSeedHash: string
    clientSeed: string
    nonce: number
    crashPoint: number | null
    verified: boolean
    chain: VerifyChainDto | null
}
