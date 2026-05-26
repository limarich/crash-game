import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Switch } from '#/components/ui/switch'
import { cn } from '#/lib/utils'
import { useGameStore } from '#/store/game.store'
import { useAuthStore } from '#/store/auth.store'
import { placeBet, cashout } from '#/lib/api'
import { useWalletQuery, useInvalidateWallet, walletKeys } from '#/hooks/useWalletQuery'
import type { WalletResponse } from '#/lib/api/types'
import type { GamePhase as ServerPhase } from '#/store/game.store'

type UIPhase = 'betting' | 'running' | 'crashed' | 'idle'

function toUIPhase(p: ServerPhase): UIPhase {
  if (p === 'BETTING') return 'betting'
  if (p === 'RUNNING') return 'running'
  if (p === 'CRASHED') return 'crashed'
  return 'idle'
}

const MIN_BET = 1
const MAX_BET = 1000
const CHIPS = [1, 5, 10, 50, 100]

export function BettingPanel() {
  const { phase: serverPhase, multiplier, myBet, setMyBet } = useGameStore()
  const { token, username } = useAuthStore()
  const { data: wallet } = useWalletQuery()
  const invalidateWallet = useInvalidateWallet()
  const queryClient = useQueryClient()

  const phase = toUIPhase(serverPhase)
  const balance = wallet ? Number(wallet.balanceInCents) / 100 : 0

  const [betAmount, setBetAmount] = useState(10)
  const [rawInput, setRawInput] = useState('10.00')
  const [inputError, setInputError] = useState(false)
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [autoCashout, setAutoCashout] = useState(2.0)
  const [rawAutoInput, setRawAutoInput] = useState('2.00')

  const [autoBetEnabled, setAutoBetEnabled] = useState(false)
  const [autoBetMode, setAutoBetMode] = useState<'fixed' | 'martingale'>('fixed')
  const [autoBetRounds, setAutoBetRounds] = useState(0)
  const [autoBetRoundsLeft, setAutoBetRoundsLeft] = useState(0)
  const [autoBetStopLoss, setAutoBetStopLoss] = useState(0)
  const [autoBetStartBalance, setAutoBetStartBalance] = useState(0)
  const [autoBetBaseBet, setAutoBetBaseBet] = useState(10)

  const betMutation = useMutation({
    mutationFn: (amountInCents: number) => placeBet(amountInCents, token!),
    onSuccess: (bet) => {
      setMyBet({ ...bet, playerId: bet.playerId ?? username ?? '' })
      invalidateWallet()
      toast.success('Bet placed!', { description: `R$ ${(Number(bet.amountInCents) / 100).toFixed(2)} locked in` })
    },
    onError: (err) => {
      toast.error('Bet failed', { description: err.message })
    },
  })

  const cashoutMutation = useMutation({
    mutationFn: () => cashout(token!),
    onSuccess: (bet) => {
      setMyBet({ ...bet, playerId: bet.playerId ?? username ?? '' })

      const payout = bet.payoutInCents ? Number(bet.payoutInCents) / 100 : 0
      const multiplier = bet.cashoutMultiplier ? Number(bet.cashoutMultiplier).toFixed(2) : '?'

      if (bet.payoutInCents) {
        queryClient.setQueryData<WalletResponse>(
          walletKeys.me(token ?? ''),
          (old) => old
            ? { ...old, balanceInCents: (BigInt(old.balanceInCents) + BigInt(bet.payoutInCents!)).toString() }
            : old,
        )
      }
      setTimeout(invalidateWallet, 1500)
      toast.success(`Cashed out at ${multiplier}x`, { description: `+R$ ${payout.toFixed(2)} credited` })
    },
    onError: (err) => {
      toast.error('Cashout failed', { description: err.message })
    },
  })

  // Bust notification when crash happens with an active bet
  const prevPhaseRef = useRef(serverPhase)
  useEffect(() => {
    if (prevPhaseRef.current === serverPhase) return
    if (serverPhase === 'CRASHED' && myBet?.status === 'LOST') {
      const amount = myBet.amountInCents ? Number(myBet.amountInCents) / 100 : 0
      toast.error('Busted!', { description: `-R$ ${amount.toFixed(2)}` })
    }
    prevPhaseRef.current = serverPhase
  }, [serverPhase, myBet?.status, myBet?.amountInCents])

  // Auto cashout effect
  const cashoutMutateRef = useRef(cashoutMutation.mutate)
  cashoutMutateRef.current = cashoutMutation.mutate

  const betMutateRef = useRef(betMutation.mutate)
  betMutateRef.current = betMutation.mutate
  const autoBetPhaseRef = useRef<UIPhase>('idle')
  const prevBetStatusRef = useRef<string | null>(null)

  useEffect(() => {
    const betIsActive = !!myBet && myBet.status !== 'CASHED_OUT' && myBet.status !== 'LOST'
    if (
      autoCashoutEnabled &&
      phase === 'running' &&
      betIsActive &&
      multiplier >= autoCashout &&
      !cashoutMutation.isPending
    ) {
      cashoutMutateRef.current()
    }
  }, [multiplier, autoCashoutEnabled, autoCashout, phase, myBet?.status, cashoutMutation.isPending])

  // Auto bet fire on transition to betting phase
  useEffect(() => {
    const prev = autoBetPhaseRef.current
    autoBetPhaseRef.current = phase

    if (prev === 'betting' || phase !== 'betting') return
    if (!autoBetEnabled || !!myBet || betMutation.isPending) return

    if (autoBetRounds > 0 && autoBetRoundsLeft <= 0) {
      setAutoBetEnabled(false)
      toast.info('Auto bet completed', { description: `All ${autoBetRounds} rounds played` })
      return
    }

    if (autoBetStopLoss > 0 && (autoBetStartBalance - balance) >= autoBetStopLoss) {
      setAutoBetEnabled(false)
      toast.warning('Auto bet stopped', { description: `Stop-loss of R$${autoBetStopLoss.toFixed(2)} reached` })
      return
    }

    const effectiveBet = Math.min(betAmount, balance)
    if (effectiveBet < MIN_BET) {
      setAutoBetEnabled(false)
      toast.warning('Auto bet stopped', { description: 'Insufficient balance' })
      return
    }
    if (effectiveBet < betAmount) applyBet(effectiveBet)
    betMutateRef.current(Math.round(effectiveBet * 100))
    if (autoBetRounds > 0) setAutoBetRoundsLeft(r => r - 1)
  }, [phase, autoBetEnabled, myBet, betMutation.isPending, autoBetRounds, autoBetRoundsLeft, autoBetStopLoss, autoBetStartBalance, balance, betAmount])

  // Martingale adjust bet after each round result
  useEffect(() => {
    if (!autoBetEnabled || autoBetMode !== 'martingale') return
    if (!myBet?.status || myBet.status === prevBetStatusRef.current) return

    prevBetStatusRef.current = myBet.status

    if (myBet.status === 'LOST') {
      const doubled = Math.min(betAmount * 2, MAX_BET, Math.max(MIN_BET, balance))
      applyBet(doubled)
    } else if (myBet.status === 'CASHED_OUT') {
      applyBet(Math.min(autoBetBaseBet, balance))
    }
  }, [myBet?.status, autoBetEnabled, autoBetMode, betAmount, autoBetBaseBet, balance])

  const loading = betMutation.isPending || cashoutMutation.isPending
  const actionError = betMutation.error?.message ?? cashoutMutation.error?.message ?? null

  const hasBet = !!myBet
  const isCashedOut = myBet?.status === 'CASHED_OUT'
  const potentialPayout = betAmount * multiplier
  const autoPayout = betAmount * autoCashout
  const isLocked = phase !== 'betting'

  function clampBet(v: number) {
    return Math.min(MAX_BET, Math.max(MIN_BET, Math.round(v * 100) / 100))
  }

  function applyBet(v: number) {
    const clamped = clampBet(v)
    setBetAmount(clamped)
    setRawInput(clamped.toFixed(2))
    setInputError(false)
  }

  function handleInputChange(val: string) {
    setRawInput(val)
    const n = parseFloat(val)
    if (isNaN(n)) { setInputError(true); return }
    setInputError(n < MIN_BET || n > MAX_BET)
    setBetAmount(clampBet(n))
  }

  function handleInputBlur() { applyBet(betAmount) }
  function adjust(delta: number) { applyBet(betAmount + delta) }

  function handleAutoInputChange(val: string) {
    setRawAutoInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 1.01) setAutoCashout(Math.round(n * 100) / 100)
  }

  function handleAutoInputBlur() {
    const clamped = Math.max(1.01, Math.round(autoCashout * 100) / 100)
    setAutoCashout(clamped)
    setRawAutoInput(clamped.toFixed(2))
  }

  function handleAutoBetToggle(enabled: boolean) {
    setAutoBetEnabled(enabled)
    if (enabled) {
      setAutoBetStartBalance(balance)
      setAutoBetRoundsLeft(autoBetRounds)
      setAutoBetBaseBet(betAmount)
    }
  }

  const insufficientFunds = betAmount > balance
  const canBet = phase === 'betting' && !hasBet && !!token && !loading && !inputError && !insufficientFunds
  const canCashout = phase === 'running' && hasBet && !isCashedOut && !!token && !loading

  return (
    <div className="flex flex-col gap-3 h-full">

      {/* Balance card */}
      <div className="card-glass ring-1 ring-neon-amber/20 px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-dim">Balance</span>
          {username && <span className="font-mono text-[10px] text-text-dim">@{username}</span>}
        </div>
        {token ? (
          <>
            <p
              className="font-mono text-[28px] font-bold text-neon-amber leading-none"
              style={{ textShadow: '0 0 18px rgba(245,158,11,0.5), 0 0 4px rgba(245,158,11,0.8)' }}
            >
              <span className="text-[16px] font-normal opacity-60 mr-1">R$</span>
              {balance.toFixed(2)}
            </p>
            <p className="mt-2 font-mono text-[10px] text-neon-green-soft tracking-[0.06em]">
              Saldo disponível
            </p>
          </>
        ) : (
          <p className="font-mono text-[13px] text-text-dim italic">Sign in to play</p>
        )}
      </div>

      {/* Bet controls card */}
      <div className="card-glass flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">Bet amount</span>
          <span className={cn('font-mono text-[10px] tracking-[0.14em] uppercase', isLocked ? 'text-text-dim' : 'text-neon-green')}>
            {isLocked ? 'Locked' : 'Open'}
          </span>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4 flex-1">

          {/* Amount input row */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjust(-1)}
              disabled={isLocked}
              aria-label="Decrease"
              className={cn(
                'w-9 h-9 shrink-0 rounded-md border font-mono text-[18px] font-light flex items-center justify-center transition-colors duration-150',
                isLocked
                  ? 'border-border text-text-faint cursor-not-allowed'
                  : 'border-border-strong text-text-mid hover:border-neon-green/40 hover:text-neon-green active:scale-95',
              )}
            >−</button>

            <div className={cn(
              'flex-1 flex items-center gap-1.5 rounded-md border px-3 h-9 transition-colors duration-150',
              inputError ? 'border-neon-red/60 bg-neon-red/[0.05]'
                : isLocked ? 'border-border bg-white/[0.02]'
                  : 'border-border-strong bg-white/[0.03] focus-within:border-neon-green/50',
            )}>
              <span className="font-mono text-[11px] text-text-dim shrink-0">R$</span>
              <input
                type="number"
                min={MIN_BET}
                max={MAX_BET}
                step="1"
                value={rawInput}
                disabled={isLocked}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleInputBlur}
                className={cn(
                  'flex-1 bg-transparent font-mono text-[14px] font-medium text-right focus:outline-none min-w-0',
                  inputError ? 'text-neon-red' : isLocked ? 'text-text-dim' : 'text-text-hi',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
            </div>

            <button
              onClick={() => adjust(1)}
              disabled={isLocked}
              aria-label="Increase"
              className={cn(
                'w-9 h-9 shrink-0 rounded-md border font-mono text-[18px] font-light flex items-center justify-center transition-colors duration-150',
                isLocked
                  ? 'border-border text-text-faint cursor-not-allowed'
                  : 'border-border-strong text-text-mid hover:border-neon-green/40 hover:text-neon-green active:scale-95',
              )}
            >+</button>
          </div>

          {inputError && (
            <p className="font-mono text-[10px] text-neon-red tracking-[0.06em]">Min R$1 · Max R$1.000</p>
          )}
          {!inputError && insufficientFunds && token && (
            <p className="font-mono text-[10px] text-neon-red tracking-[0.06em]">Saldo insuficiente</p>
          )}

          {/* Quick chips */}
          <div className="grid grid-cols-5 gap-1.5">
            {CHIPS.map((c) => (
              <button
                key={c}
                disabled={isLocked}
                onClick={() => applyBet(c)}
                className={cn(
                  'h-7 rounded-md border font-mono text-[11px] font-medium transition-colors duration-150',
                  isLocked ? 'border-border text-text-faint cursor-not-allowed'
                    : betAmount === c
                      ? 'border-neon-green/60 bg-neon-green/10 text-neon-green'
                      : 'border-border-strong text-text-dim hover:border-neon-green/30 hover:text-text-mid',
                )}
              >
                {c < 100 ? `R$${c}` : '100'}
              </button>
            ))}
          </div>

          <PrimaryButton
            phase={phase}
            hasBet={hasBet}
            betAmount={betAmount}
            multiplier={multiplier}
            potentialPayout={potentialPayout}
            canBet={canBet}
            canCashout={canCashout}
            loading={loading}
            loggedIn={!!token}
            onBet={() => betMutation.mutate(Math.round(betAmount * 100))}
            onCashout={() => cashoutMutation.mutate()}
          />

          {actionError && (
            <p className="font-mono text-[10px] text-neon-red text-center">{actionError}</p>
          )}

          {phase === 'running' && hasBet && (
            <p className="font-mono text-[10px] text-center tracking-[0.06em] text-text-dim">
              Current payout{' '}
              <span className="text-neon-amber font-semibold">R$ {potentialPayout.toFixed(2)}</span>
              {' '}at <span className="text-text-mid">{multiplier.toFixed(2)}x</span>
            </p>
          )}
        </div>
      </div>

      {/* Auto-cashout card */}
      <div className="card-glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">Auto cashout</span>
          <span className={cn('font-mono text-[10px] tracking-[0.14em] uppercase', autoCashoutEnabled ? 'text-neon-green' : 'text-text-dim')}>
            {autoCashoutEnabled ? 'On' : 'Off'}
          </span>
        </div>

        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-mono text-[11px] text-text-body">Cash out at</span>
            <span className="font-mono text-[10px] text-text-dim">≈ R$ {autoPayout.toFixed(2)} payout</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className={cn(
              'flex items-center gap-1 rounded-md border px-2 h-8 w-[72px]',
              autoCashoutEnabled ? 'border-border-strong bg-white/[0.03]' : 'border-border bg-white/[0.01]',
            )}>
              <input
                type="number"
                min="1.01"
                step="0.05"
                value={rawAutoInput}
                disabled={!autoCashoutEnabled}
                onChange={(e) => handleAutoInputChange(e.target.value)}
                onBlur={handleAutoInputBlur}
                className={cn(
                  'w-full bg-transparent font-mono text-[12px] font-medium text-right focus:outline-none',
                  autoCashoutEnabled ? 'text-text-hi' : 'text-text-faint',
                  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                )}
              />
              <span className="font-mono text-[10px] text-text-dim shrink-0">x</span>
            </div>
            <Switch checked={autoCashoutEnabled} onCheckedChange={setAutoCashoutEnabled} aria-label="Toggle auto cashout" />
          </div>
        </div>
      </div>

      {/* Auto bet card */}
      <div className="card-glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-text-mid">Auto bet</span>
          <div className="flex items-center gap-2">
            <span className={cn('font-mono text-[10px] tracking-[0.14em] uppercase', autoBetEnabled ? 'text-neon-green' : 'text-text-dim')}>
              {autoBetEnabled
                ? autoBetRounds > 0 ? `${autoBetRoundsLeft} left` : 'On'
                : 'Off'}
            </span>
            <Switch checked={autoBetEnabled} onCheckedChange={handleAutoBetToggle} aria-label="Toggle auto bet" />
          </div>
        </div>

        <div className="px-4 py-3 flex flex-col gap-3">
          {/* Mode selector */}
          <div className="flex gap-1.5">
            {(['fixed', 'martingale'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setAutoBetMode(m)}
                disabled={autoBetEnabled}
                className={cn(
                  'flex-1 h-7 rounded-md border font-mono text-[11px] font-medium transition-colors duration-150 capitalize',
                  autoBetEnabled && 'opacity-50 cursor-not-allowed',
                  autoBetMode === m
                    ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-border text-text-dim hover:border-border-strong hover:text-text-mid',
                )}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Config row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-text-dim">Rounds (0=∞)</span>
              <div className={cn(
                'flex items-center rounded-md border px-2 h-8',
                autoBetEnabled ? 'border-border bg-white/[0.01]' : 'border-border-strong bg-white/[0.03]',
              )}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={autoBetRounds}
                  disabled={autoBetEnabled}
                  onChange={(e) => setAutoBetRounds(Math.max(0, parseInt(e.target.value) || 0))}
                  className={cn(
                    'w-full bg-transparent font-mono text-[12px] font-medium text-right focus:outline-none',
                    autoBetEnabled ? 'text-text-faint' : 'text-text-hi',
                    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-text-dim">Stop-loss R$ (0=off)</span>
              <div className={cn(
                'flex items-center gap-1 rounded-md border px-2 h-8',
                autoBetEnabled ? 'border-border bg-white/[0.01]' : 'border-border-strong bg-white/[0.03]',
              )}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={autoBetStopLoss}
                  disabled={autoBetEnabled}
                  onChange={(e) => setAutoBetStopLoss(Math.max(0, parseFloat(e.target.value) || 0))}
                  className={cn(
                    'w-full bg-transparent font-mono text-[12px] font-medium text-right focus:outline-none',
                    autoBetEnabled ? 'text-text-faint' : 'text-text-hi',
                    '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
                  )}
                />
              </div>
            </div>
          </div>

          {autoBetEnabled && (
            <p className="font-mono text-[10px] text-text-dim text-center tracking-[0.06em]">
              {autoBetMode === 'martingale' ? 'Martingale' : 'Fixed'} · R${betAmount.toFixed(2)}/bet
              {autoBetRounds > 0 && ` · ${autoBetRoundsLeft} rounds left`}
              {autoBetStopLoss > 0 && ` · stop R$${autoBetStopLoss}`}
            </p>
          )}
        </div>
      </div>

    </div>
  )
}

interface PrimaryButtonProps {
  phase: UIPhase
  hasBet: boolean
  betAmount: number
  multiplier: number
  potentialPayout: number
  canBet: boolean
  canCashout: boolean
  loading: boolean
  loggedIn: boolean
  onBet: () => void
  onCashout: () => void
}

function PrimaryButton({ phase, hasBet, betAmount, potentialPayout, canBet, canCashout, loading, loggedIn, onBet, onCashout }: PrimaryButtonProps) {
  if (!loggedIn) {
    return (
      <button disabled className="w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 border border-border bg-white/[0.02] cursor-not-allowed">
        <span className="font-mono text-[13px] font-semibold text-text-dim tracking-[0.04em]">Sign in to play</span>
        <span className="font-mono text-[10px] text-text-faint tracking-[0.04em]">Login required</span>
      </button>
    )
  }

  if (phase === 'running' && hasBet) {
    return (
      <button
        onClick={onCashout}
        disabled={!canCashout}
        className={cn(
          'w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 transition-colors duration-150',
          'border bg-neon-amber/10 hover:bg-neon-amber/18 active:scale-[0.98]',
          canCashout && !loading ? 'animate-cashout-pulse' : 'border-neon-amber/50',
          !canCashout && 'opacity-60 cursor-not-allowed',
        )}
      >
        <span className="font-mono text-[14px] font-bold tracking-[0.06em] text-neon-amber">
          {loading ? 'Processing…' : 'Cash out'}
        </span>
        {!loading && (
          <span className="font-mono text-[10px] text-neon-amber/70 tracking-[0.04em]">
            → R$ {potentialPayout.toFixed(2)}
          </span>
        )}
      </button>
    )
  }

  if (phase === 'running' && !hasBet) {
    return (
      <button disabled className="w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 border border-border bg-white/[0.02] cursor-not-allowed">
        <span className="font-mono text-[13px] font-semibold text-text-dim tracking-[0.04em]">Round in progress</span>
        <span className="font-mono text-[10px] text-text-faint tracking-[0.04em]">Wait for next betting window</span>
      </button>
    )
  }

  if (phase === 'betting') {
    return (
      <button
        onClick={canBet ? onBet : undefined}
        disabled={!canBet}
        className={cn(
          'w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 transition-all duration-150',
          canBet
            ? 'border border-neon-green/50 bg-neon-green/10 hover:bg-neon-green/16 hover:border-neon-green/70 active:scale-[0.98]'
            : 'border border-border bg-white/[0.02] cursor-not-allowed',
        )}
        style={canBet ? { boxShadow: '0 0 20px rgba(0,255,136,0.12)' } : undefined}
      >
        <span className={cn('font-mono text-[14px] font-bold tracking-[0.06em]', canBet ? 'text-neon-green' : 'text-text-dim')}>
          {loading ? 'Placing…' : hasBet ? 'Confirmed' : `Bet R$ ${betAmount.toFixed(2)}`}
        </span>
        <span className={cn('font-mono text-[10px] tracking-[0.04em]', canBet ? 'text-neon-green/60' : 'text-text-faint')}>
          {hasBet ? 'Good luck!' : 'Locks at countdown end'}
        </span>
      </button>
    )
  }

  return (
    <button disabled className="w-full rounded-lg py-3 px-4 flex flex-col items-center gap-0.5 border border-border bg-white/[0.02] cursor-not-allowed">
      <span className="font-mono text-[13px] font-semibold text-text-dim tracking-[0.04em]">Crashed</span>
      <span className="font-mono text-[10px] text-text-faint tracking-[0.04em]">New round soon</span>
    </button>
  )
}
