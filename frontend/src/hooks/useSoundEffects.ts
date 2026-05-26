import { useEffect, useRef } from 'react'
import { useGameStore } from '#/store/game.store'
import {
  playBetPlaced,
  playMultiplierTick,
  playCashout,
  playCrash,
  playCountdownBeep,
} from '#/lib/sounds'

export function useSoundEffects() {
  const phase = useGameStore((s) => s.phase)
  const multiplier = useGameStore((s) => s.multiplier)
  const myBet = useGameStore((s) => s.myBet)
  const bettingEndsAt = useGameStore((s) => s.bettingEndsAt)

  const prevPhase = useRef(phase)
  const prevMyBetStatus = useRef(myBet?.status)
  const prevMyBetId = useRef(myBet?.id)

  // Phase transitions -> crash sound
  useEffect(() => {
    if (prevPhase.current === phase) return
    if (phase === 'CRASHED') playCrash()
    prevPhase.current = phase
  }, [phase])

  // Multiplier tick during RUNNING
  useEffect(() => {
    if (phase !== 'RUNNING') return
    playMultiplierTick(multiplier)
  }, [multiplier, phase])

  // Bet placed: myBet id went from null -> something
  useEffect(() => {
    if (!myBet?.id) {
      prevMyBetId.current = undefined
      prevMyBetStatus.current = undefined
      return
    }

    // New bet (different id or first ever)
    if (myBet.id !== prevMyBetId.current) {
      playBetPlaced()
      prevMyBetId.current = myBet.id
      prevMyBetStatus.current = myBet.status
      return
    }

    // Status changed -> cashout
    if (prevMyBetStatus.current !== 'CASHED_OUT' && myBet.status === 'CASHED_OUT') {
      playCashout()
    }

    prevMyBetStatus.current = myBet.status
  }, [myBet?.id, myBet?.status])

  // Countdown beeps: fire once at 3s, 2s, 1s remaining
  const beeped = useRef<Set<number>>(new Set())
  useEffect(() => {
    if (phase !== 'BETTING' || !bettingEndsAt) {
      beeped.current.clear()
      return
    }

    const id = setInterval(() => {
      const secsLeft = Math.ceil((bettingEndsAt.getTime() - Date.now()) / 1000)
      if (secsLeft <= 3 && secsLeft >= 1 && !beeped.current.has(secsLeft)) {
        beeped.current.add(secsLeft)
        playCountdownBeep(secsLeft === 1)
      }
    }, 100)

    return () => clearInterval(id)
  }, [phase, bettingEndsAt])
}
