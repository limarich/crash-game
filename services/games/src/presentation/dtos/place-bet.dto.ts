import { IsNotEmpty, IsString, Matches } from 'class-validator'

export class PlaceBetDto {
    @IsString()
    @IsNotEmpty()
    @Matches(/^\d+$/, { message: 'amountInCents must be a numeric string' })
    amountInCents: string
}