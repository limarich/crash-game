import { IsNotEmpty, IsString, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class PlaceBetDto {
    @ApiProperty({
        example: '1000',
        description: 'Valor da aposta em centavos como string. Mín: 100 (R$ 1,00), Máx: 100000 (R$ 1.000,00)',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+$/, { message: 'amountInCents must be a numeric string' })
    amountInCents: string
}