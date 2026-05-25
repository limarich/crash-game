import { Background } from '#/components/chrome/Background'
import { TopBar } from '#/components/chrome/TopBar'
import { CrashGraph } from '#/components/game/CrashGraph'
import { BetsList } from '#/components/game/BetsList'
import { BettingPanel } from '#/components/game/BettingPanel'
import { RoundHistory } from '#/components/game/RoundHistory'

const DEMO_PHASE = 'betting' as const
const DEMO_MULTIPLIER = 2.47
const DEMO_ROUND_ID = 89433
const DEMO_SEED_HASH = 'abc12345def67890abc12345def67890abc12345def67890abc12345ef67890ab'
const DEMO_BETTING_PROGRESS = 0.6
const DEMO_BETTING_SECONDS_LEFT = 2.4

export function Home() {
    return (
        <>
            <Background />

            <div className="relative z-10 min-h-screen flex flex-col">
                <TopBar />

                <main
                    className="flex-1 w-full max-w-[1440px] mx-auto p-5 grid gap-5
            [grid-template-columns:1fr]
            xl:[grid-template-columns:340px_minmax(0,1fr)_360px]
            [&>*]:min-w-0"
                >
                    <BettingPanel phase={DEMO_PHASE} multiplier={DEMO_MULTIPLIER} />

                    <div className="flex flex-col gap-3 min-w-0">
                        <CrashGraph
                            phase={DEMO_PHASE}
                            multiplier={DEMO_MULTIPLIER}
                            roundId={DEMO_ROUND_ID}
                            seedHash={DEMO_SEED_HASH}
                            bettingProgress={DEMO_BETTING_PROGRESS}
                            bettingSecondsLeft={DEMO_BETTING_SECONDS_LEFT}
                        />
                        <RoundHistory currentRoundId={DEMO_ROUND_ID} />
                    </div>

                    <BetsList phase={DEMO_PHASE} />
                </main>
            </div>
        </>
    )
}
