import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '#/store/game.store'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:4001'

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null)
  const {
    syncFromServer,
    onBettingStarted,
    onRoundStarted,
    onTick,
    onCrashed,
    onBetPlaced,
    onBetCashedOut,
    setConnected,
  } = useGameStore()

  useEffect(() => {
    const socket = io(WS_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('round:sync', syncFromServer)
    socket.on('round:betting-started', onBettingStarted)
    socket.on('round:started', onRoundStarted)
    socket.on('round:tick', onTick)
    socket.on('round:crashed', onCrashed)
    socket.on('bet:placed', onBetPlaced)
    socket.on('bet:cashedout', onBetCashedOut)

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  return socketRef.current
}
