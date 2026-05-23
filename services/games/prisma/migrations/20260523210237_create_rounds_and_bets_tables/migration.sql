-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('BETTING', 'RUNNING', 'CRASHED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'CASHED_OUT', 'LOST');

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "crash_point" DOUBLE PRECISION NOT NULL,
    "betting_ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "RoundStatus" NOT NULL DEFAULT 'BETTING',
    "client_seed" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "crashed_at" TIMESTAMP(3),
    "nonce" INTEGER NOT NULL,
    "server_seed" TEXT NOT NULL,
    "server_seed_hash" TEXT NOT NULL,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "amount_in_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "cashout_multiplier" DOUBLE PRECISION,
    "payout_in_cents" BIGINT,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rounds_nonce_key" ON "rounds"("nonce");

-- CreateIndex
CREATE UNIQUE INDEX "bets_player_id_round_id_key" ON "bets"("player_id", "round_id");
