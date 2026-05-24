export class VerifyResponseDto {
    roundId: string
    serverSeed: string | null
    serverSeedHash: string
    clientSeed: string
    nonce: number
    crashPoint: number | null
    verified: boolean
    chain: boolean | null
}
