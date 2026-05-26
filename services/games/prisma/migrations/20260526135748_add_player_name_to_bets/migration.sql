-- AlterTable: add player_name with a temporary default for existing rows, then remove the default
ALTER TABLE "bets" ADD COLUMN "player_name" TEXT NOT NULL DEFAULT 'unknown';
ALTER TABLE "bets" ALTER COLUMN "player_name" DROP DEFAULT;
