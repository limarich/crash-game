import type { IBetRepository } from "@/domain/bet/bet.interface";
import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import type { IRoundRepository } from "@/domain/round/round.interface";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { GameEventsPublisher } from "@/infrastructure/messaging/game-events.publisher";
import { Inject, Injectable, UnprocessableEntityException } from "@nestjs/common";
import { CashoutInput } from "../dto/bet-operation.dto";

@Injectable()
export class CashoutUseCase {
    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository,
        private readonly publisher: GameEventsPublisher
    ) { }


    async execute(data: CashoutInput) {
        const round = await this.roundRepository.findCurrent()

        if (!round || round.getStatus() !== 'RUNNING') {
            throw new UnprocessableEntityException('No active running round')
        }

        const bet = await this.betRepository.findByPlayerAndRoundWithLock(data.playerId, round.id);

        if (!bet || bet.getStatus() !== 'CONFIRMED') {
            throw new UnprocessableEntityException('No active bet found for this player')
        }

        const multiplier = round.getCurrentMultiplier(Date.now())

        bet.cashout(multiplier)

        const payoutInCents = bet.getPayoutInCents()

        if (!payoutInCents) {
            throw new Error('Payout calculation failed')
        }

        await this.betRepository.save(bet)

        await this.publisher.publishCreditRequest({
            betId: bet.id,
            playerId: data.playerId,
            amountInCents: payoutInCents.toString(),
        })

        return bet

    }

}