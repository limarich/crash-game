import { Background } from '#/components/chrome/Background'
import { TopBar } from '#/components/chrome/TopBar'

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
                    <div className="card-glass p-5 min-h-[200px]" />

                    <div className="card-glass p-5 min-h-[520px]" />

                    <div className="card-glass p-5 min-h-[200px]" />
                </main>
            </div>
        </>
    )
}
