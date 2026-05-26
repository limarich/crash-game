import { useQuery } from '@tanstack/react-query'
import { cn } from '#/lib/utils'
import { getMyBets } from '#/lib/api'
import { useAuthStore } from '#/store/auth.store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { ScrollArea } from '#/components/ui/scroll-area'
import type { BetResponse } from '#/lib/api/types'

interface Props {
  open: boolean
  onClose: () => void
}

function statusLabel(bet: BetResponse) {
  if (bet.status === 'CASHED_OUT') return { text: `${Number(bet.cashoutMultiplier).toFixed(2)}x`, color: 'text-neon-green' }
  if (bet.status === 'LOST') return { text: 'Lost', color: 'text-neon-red opacity-70' }
  if (bet.status === 'CANCELLED') return { text: 'Cancelled', color: 'text-text-dim' }
  return { text: bet.status, color: 'text-text-dim' }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function BetHistoryModal({ open, onClose }: Props) {
  const { token } = useAuthStore()

  const { data: bets = [], isLoading } = useQuery({
    queryKey: ['my-bets', token],
    queryFn: () => getMyBets(token!),
    enabled: open && !!token,
    staleTime: 30_000,
  })

  const totalWagered = bets.reduce((s, b) => s + Number(b.amountInCents) / 100, 0)
  const totalPayout = bets.reduce((s, b) => s + Number(b.payoutInCents ?? 0) / 100, 0)
  const wins = bets.filter((b) => b.status === 'CASHED_OUT').length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-popover border-glass-border text-text-body max-w-lg w-full p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-glass-border">
          <DialogTitle className="font-display font-bold text-text-hi text-[15px] tracking-[0.04em]">
            Bet History
          </DialogTitle>
        </DialogHeader>

        {/* Summary strip */}
        <div className="grid grid-cols-3 border-b border-glass-border">
          {[
            { label: 'Bets', value: bets.length.toString() },
            { label: 'Wins', value: wins.toString() },
            { label: 'P&L', value: `R$ ${(totalPayout - totalWagered).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 text-center">
              <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-text-dim mb-1">{label}</p>
              <p className={cn(
                'font-mono text-[15px] font-semibold',
                label === 'P&L' && (totalPayout - totalWagered) >= 0 ? 'text-neon-green' : 'text-text-hi',
                label === 'P&L' && (totalPayout - totalWagered) < 0 ? 'text-neon-red' : '',
              )}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Column headers */}
        <div className="grid px-4 py-2 font-mono text-[9px] tracking-[0.18em] uppercase text-text-dim border-b border-glass-border [grid-template-columns:1fr_0.8fr_0.8fr_0.8fr]">
          <span>Date</span>
          <span>Bet</span>
          <span>Payout</span>
          <span className="text-right">Result</span>
        </div>

        <ScrollArea className="max-h-[360px]">
          {isLoading ? (
            <p className="px-4 py-8 font-mono text-[11px] text-text-faint text-center">Loading…</p>
          ) : bets.length === 0 ? (
            <p className="px-4 py-8 font-mono text-[11px] text-text-faint text-center">No bets yet</p>
          ) : (
            <div className="flex flex-col">
              {bets.map((bet) => {
                const { text, color } = statusLabel(bet)
                const amount = Number(bet.amountInCents) / 100
                const payout = Number(bet.payoutInCents ?? 0) / 100
                return (
                  <div
                    key={bet.id}
                    className="grid items-center px-4 py-3 border-b border-glass-border/50 [grid-template-columns:1fr_0.8fr_0.8fr_0.8fr] hover:bg-white/[0.02] transition-colors duration-100"
                  >
                    <span className="font-mono text-[11px] text-text-dim">{formatDate(bet.createdAt)}</span>
                    <span className="font-mono text-[12px] text-text-body">R$ {amount.toFixed(2)}</span>
                    <span className={cn('font-mono text-[12px]', payout > 0 ? 'text-neon-green' : 'text-text-dim')}>
                      {payout > 0 ? `R$ ${payout.toFixed(2)}` : '—'}
                    </span>
                    <span className={cn('font-mono text-[12px] font-semibold text-right', color)}>{text}</span>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
