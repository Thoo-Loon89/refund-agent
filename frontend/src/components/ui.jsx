import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react'

export const DECISION = {
  APPROVE: {
    label: 'Approved',
    icon: CheckCircle2,
    cls: 'text-emerald-300 bg-emerald-500/10 border-emerald-400/30',
    dot: 'bg-emerald-400',
  },
  DENY: {
    label: 'Denied',
    icon: XCircle,
    cls: 'text-rose-300 bg-rose-500/10 border-rose-400/30',
    dot: 'bg-rose-400',
  },
  ESCALATE: {
    label: 'Escalated',
    icon: AlertTriangle,
    cls: 'text-amber-300 bg-amber-500/10 border-amber-400/30',
    dot: 'bg-amber-400',
  },
  NEEDS_INFO: {
    label: 'Needs info',
    icon: HelpCircle,
    cls: 'text-sky-300 bg-sky-500/10 border-sky-400/30',
    dot: 'bg-sky-400',
  },
}

export function DecisionBadge({ decision, size = 'sm' }) {
  const d = DECISION[decision] || DECISION.NEEDS_INFO
  const Icon = d.icon
  const pad = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${pad} ${d.cls}`}
    >
      <Icon size={size === 'lg' ? 16 : 13} />
      {d.label}
    </span>
  )
}

export function Pill({ children }) {
  return (
    <span className="rounded-md bg-white/5 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
      {children}
    </span>
  )
}

export function Card({ className = '', children }) {
  return <div className={`glass rounded-2xl ${className}`}>{children}</div>
}
