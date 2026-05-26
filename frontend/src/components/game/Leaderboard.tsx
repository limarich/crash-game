import { useLeaderboardQuery } from '#/hooks/useLeaderboardQuery'
import { cn } from '#/lib/utils'

const MEDALS = ['🥇', '🥈', '🥉']

function formatProfit(cents: string) {
  const value = Number(cents) / 100
  const sign = value >= 0 ? '+' : ''
  return `${sign}R$ ${Math.abs(value).toFixed(2)}`
}


export function Leaderboard() {
  const { data: entries, isLoading } = useLeaderboardQuery(10)

  return (
    <div className="card-glass flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">Leaderboard</span>
        <span className="font-mono text-[10px] text-text-dim">net profit</span>
      </div>

      <div className="flex flex-col divide-y divide-border overflow-y-auto max-h-[260px]">
        {isLoading && (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5 animate-pulse">
              <div className="w-5 h-3 rounded bg-white/10 shrink-0" />
              <div className="flex-1 h-3 rounded bg-white/10" />
              <div className="w-16 h-3 rounded bg-white/10 shrink-0" />
            </div>
          ))
        )}

        {!isLoading && (!entries || entries.length === 0) && (
          <p className="px-4 py-6 font-mono text-[11px] text-text-dim text-center">
            No data yet — play some rounds!
          </p>
        )}

        {entries?.map((entry, i) => {
          const profit = Number(entry.netProfitInCents)
          const isPositive = profit >= 0

          return (
            <div key={entry.playerId} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 text-center text-[13px] shrink-0">
                {i < 3 ? MEDALS[i] : <span className="font-mono text-[10px] text-text-dim">{i + 1}</span>}
              </span>

              <span className="flex-1 font-mono text-[11px] text-text-body truncate min-w-0">
                {entry.playerName}
              </span>

              <span className={cn(
                'font-mono text-[11px] font-semibold shrink-0',
                isPositive ? 'text-neon-green' : 'text-neon-red',
              )}>
                {formatProfit(entry.netProfitInCents)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
