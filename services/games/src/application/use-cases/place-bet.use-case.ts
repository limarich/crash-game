import { BET_REPOSITORY } from "@/domain/bet/bet.token";
import { ROUND_REPOSITORY } from "@/domain/round/round.token";
import { ConflictException, Inject, Injectable, Optional, UnprocessableEntityException } from "@nestjs/common";
import { PlaceBetInput } from "../dto/bet-operation.dto";
import { Bet } from "@/domain/bet/bet.entity";
import { InvalidBetAmountError } from "@/domain/bet/bet.errors";
import { randomUUID } from "crypto";
import { GameEventsPublisher } from "@/infrastructure/messaging/game-events.publisher";
import type { IRoundRepository } from "@/domain/round/round.interface";
import type { IBetRepository } from "@/domain/bet/bet.interface";
import { GameGateway } from "@/presentation/websocket/game.gateway";

@Injectable()
export class PlaceBetUseCase {
    constructor(
        @Inject(ROUND_REPOSITORY)
        private readonly roundRepository: IRoundRepository,
        @Inject(BET_REPOSITORY)
        private readonly betRepository: IBetRepository,
        private readonly publisher: GameEventsPublisher,
        @Optional() private readonly gateway?: GameGateway,
    ) { }

    async execute(data: PlaceBetInput) {
        const round = await this.roundRepository.findCurrent()

        if (!round || round.getStatus() !== 'BETTING') {
            throw new UnprocessableEntityException('No active betting round')
        }

        const existingBet = await this.betRepository.findByPlayerAndRound(
            data.playerId,
            round.id,
        )

        if (existingBet) {
            throw new ConflictException('Player already has a bet in this round')
        }

        let bet: Bet
        try {
            bet = new Bet({
                id: randomUUID(),
                roundId: round.id,
                playerId: data.playerId,
                amountInCents: BigInt(data.amountInCents),
                createdAt: new Date(),
            })
        } catch (err) {
            if (err instanceof InvalidBetAmountError) {
                throw new UnprocessableEntityException(err.message)
            }
            throw err
        }

        await this.betRepository.save(bet);

        this.gateway?.emitBetPlaced(round.id, data.playerId, data.amountInCents)

        await this.publisher.publishDebitRequest({
            amountInCents: data.amountInCents,
            betId: bet.id,
            playerId: data.playerId,
        })

        return bet;
    }

}