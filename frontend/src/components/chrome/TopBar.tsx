import { useState, useEffect } from 'react'
import { Triangle } from 'lucide-react'
import { Avatar, AvatarFallback } from '#/components/ui/avatar'
import { Badge } from '#/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '#/components/ui/tooltip'
import { LoginModal } from './LoginModal'
import { BetHistoryModal } from './BetHistoryModal'
import { useAuthStore } from '#/store/auth.store'
import { useWalletQuery } from '#/hooks/useWalletQuery'

export function TopBar() {
  const { token, username, logout, loginModalOpen, openLoginModal, closeLoginModal } = useAuthStore()
  const [historyOpen, setHistoryOpen] = useState(false)
  const { data: wallet } = useWalletQuery()
  const [onlineCount, setOnlineCount] = useState(14728)

  useEffect(() => {
    const tick = () => {
      setOnlineCount((n) => n + Math.floor(Math.random() * 7) - 3)
      setTimeout(tick, 2500 + Math.random() * 3000)
    }
    const id = setTimeout(tick, 2500 + Math.random() * 3000)
    return () => clearTimeout(id)
  }, [])

  const isLoggedIn = !!token
  const displayName = username ?? 'guest'
  const initial = displayName[0].toUpperCase()
  const balance = wallet ? `R$ ${(Number(wallet.balanceInCents) / 100).toFixed(2)}` : null

  return (
    <>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-4 px-5 py-4 border-b border-glass-border"
        style={{
          background: 'linear-gradient(180deg, rgba(8, 9, 22, 0.85), rgba(8, 9, 22, 0.4))',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 grid place-items-center rounded-[9px] font-mono font-extrabold text-bg-base"
            style={{
              background: 'linear-gradient(135deg, var(--neon-green), var(--neon-cyan))',
              boxShadow: 'var(--glow-green)',
            }}
          >
            <Triangle className="w-4 h-4 fill-current" />
          </div>

          <span className="font-display font-bold text-lg tracking-[0.04em] text-text-hi">
            CRASH<em className="not-italic" style={{ color: 'var(--neon-green)', textShadow: '0 0 12px rgba(0,255,136,0.45)' }}>SH</em>AUS
          </span>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex font-mono text-[10px] tracking-[0.2em] uppercase text-text-dim border-border px-1.5 py-0.5 cursor-help"
                >
                  provably fair
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="border-glass-border text-text-faint text-xs">
                Resultados criptograficamente auditáveis
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase text-text-mid">
            <span
              className="w-2 h-2 rounded-full bg-neon-green"
              style={{ boxShadow: '0 0 8px var(--neon-green)' }}
            />
            {onlineCount.toLocaleString('pt-BR')} online
          </span>

          {!isLoggedIn ? (
            <button
              onClick={openLoginModal}
              className="flex items-center gap-2 px-4 py-1.5 rounded-pill border border-neon-green/40 bg-neon-green/8 font-mono text-[12px] font-semibold text-neon-green tracking-[0.08em] hover:bg-neon-green/14 hover:border-neon-green/60 transition-colors duration-150"
            >
              Sign in
            </button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 rounded-pill
                  border border-border-strong bg-glass hover:bg-glass-strong
                  hover:border-glass-border-strong
                  transition-colors duration-150 focus:outline-none"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback
                      className="text-white font-bold text-xs"
                      style={{ background: 'linear-gradient(135deg, var(--neon-magenta), var(--neon-violet))' }}
                    >
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left leading-tight">
                    <span className="font-semibold text-text-hi text-[13px]">{displayName}</span>
                    {balance && (
                      <span className="font-mono text-[10px] tracking-[0.1em] text-neon-amber">{balance}</span>
                    )}
                  </div>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-44 bg-popover border-glass-border text-text-body">
                <DropdownMenuLabel className="text-text-hi font-mono text-xs">{displayName}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-glass-border" />
                <DropdownMenuItem onClick={() => setHistoryOpen(true)} className="focus:bg-glass hover:text-neon-cyan cursor-pointer text-sm">
                  Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-glass-border" />
                <DropdownMenuItem
                  onClick={logout}
                  className="focus:bg-glass text-neon-red cursor-pointer text-sm"
                >
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      <LoginModal open={loginModalOpen} onClose={closeLoginModal} />
      <BetHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  )
}
