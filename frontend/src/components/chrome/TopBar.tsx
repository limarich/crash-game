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

export function TopBar() {
  return (
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
                className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-dim border-border px-1.5 py-0.5 cursor-help"
              >
                provably fair
              </Badge>
            </TooltipTrigger>
            <TooltipContent className="border-glass-border text-text-faint text-xs ">
              Resultados criptograficamente auditáveis
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Stats + user */}
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 font-mono text-[11px] tracking-[0.16em] uppercase text-text-mid">
          <span
            className="w-2 h-2 rounded-full bg-neon-green"
            style={{ boxShadow: '0 0 8px var(--neon-green)' }}
          />
          14.728 online
        </span>

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
                  Y
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left leading-tight">
                <span className="font-semibold text-text-hi text-[13px]">you</span>
                <span className="font-mono text-[10px] tracking-[0.15em] uppercase text-text-dim">Player</span>
              </div>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44 bg-popover border-glass-border text-text-body">
            <DropdownMenuLabel className="text-text-hi font-mono text-xs">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-glass-border" />
            <DropdownMenuItem className="focus:bg-glass hover:text-neon-cyan cursor-pointer text-sm">
              Histórico
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-glass hover:text-neon-cyan cursor-pointer text-sm">
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-glass-border" />
            <DropdownMenuItem className="focus:bg-glass text-neon-red cursor-pointer text-sm">
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
