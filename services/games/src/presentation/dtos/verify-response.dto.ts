import { ApiProperty } from '@nestjs/swagger'

export class VerifyChainDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
    nextRoundId: string

    @ApiProperty({ example: 'c4d9...' })
    nextServerSeedHash: string

    @ApiProperty({ example: true, description: 'SHA256(SHA256(serverSeed[N])) === serverSeedHash[N+1]' })
    chainValid: boolean
}

export class VerifyResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    roundId: string

    @ApiProperty({ example: 'b7e2...', nullable: true, description: 'Revelado apenas após o crash' })
    serverSeed: string | null

    @ApiProperty({ example: 'a3f1...', description: 'SHA256 do serverSeed — publicado antes da rodada' })
    serverSeedHash: string

    @ApiProperty({ example: 'abc123def456' })
    clientSeed: string

    @ApiProperty({ example: 42 })
    nonce: number

    @ApiProperty({ example: 3.14, nullable: true, description: 'Revelado apenas após o crash' })
    crashPoint: number | null

    @ApiProperty({ example: true, description: 'SHA256(serverSeed) === serverSeedHash' })
    verified: boolean

    @ApiProperty({ type: () => VerifyChainDto, nullable: true, description: 'Dados de verificação da hash chain com a rodada seguinte' })
    chain: VerifyChainDto | null
}
