import { ApiProperty } from "@nestjs/swagger";
import { Wallet } from "@/domain/wallet/wallet.entity";

export class WalletResponseDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'Wallet ID' })
    id: string

    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001', description: 'Keycloak user sub (JWT subject)' })
    playerId: string

    @ApiProperty({ example: '100000', description: 'Balance in cents as string (R$ 1.000,00 = 100000)' })
    balanceInCents: string

    static from(wallet: Wallet): WalletResponseDto {
        return {
            id: wallet.id,
            playerId: wallet.playerId,
            balanceInCents: wallet.balance.toString(),
        };
    }
}