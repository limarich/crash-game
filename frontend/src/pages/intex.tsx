import { Background } from '#/components/chrome/Background'
import { TopBar } from '#/components/chrome/TopBar'
import { LoginBanner } from '#/components/chrome/LoginBanner'
import { CrashGraph } from '#/components/game/CrashGraph'
import { BetsList } from '#/components/game/BetsList'
import { BettingPanel } from '#/components/game/BettingPanel'
import { RoundHistory } from '#/components/game/RoundHistory'
import { useGameSocket } from '#/hooks/useGameSocket'
import { useSoundEffects } from '#/hooks/useSoundEffects'

export function Home() {
    useGameSocket()
    useSoundEffects()

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
                    <BettingPanel />

                    <div className="flex flex-col gap-3 min-w-0">
                        <CrashGraph />
                        <RoundHistory />
                    </div>

                    <BetsList />
                </main>
            </div>

            <LoginBanner />
        </>
    )
}
