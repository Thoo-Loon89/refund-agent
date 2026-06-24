import { useState } from 'react'
import {
  ChevronDown,
  Cpu,
  Timer,
  RefreshCw,
  ShieldAlert,
  Wrench,
  Brain,
  MessageSquare,
  Scale,
} from 'lucide-react'

const STEP_META = {
  llm_call: { icon: Brain, label: 'LLM call', tint: 'text-indigo-300' },
  tool_call: { icon: Wrench, label: 'Tool call', tint: 'text-cyan-300' },
  clarifying_question: { icon: MessageSquare, label: 'Clarifying question', tint: 'text-sky-300' },
  final_model_output: { icon: Brain, label: 'Final model output', tint: 'text-violet-300' },
  compose_message: { icon: MessageSquare, label: 'Compose reply', tint: 'text-fuchsia-300' },
  injection_screen: { icon: ShieldAlert, label: 'Injection screen', tint: 'text-rose-300' },
}

function Metric({ icon: Icon, label, value, tint }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2">
      <Icon size={15} className={tint} />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-slate-200">{value}</div>
      </div>
    </div>
  )
}

function Step({ step, index }) {
  const [open, setOpen] = useState(false)
  const meta = STEP_META[step.type] || { icon: Cpu, label: step.type, tint: 'text-slate-300' }
  const Icon = meta.icon
  const subtitle =
    step.tool ||
    (step.error ? 'error' : '') ||
    (step.type === 'llm_call' && step.total_tokens ? `${step.total_tokens} tok` : '')
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left"
      >
        <span className="text-[11px] font-mono text-slate-600">{index}</span>
        <Icon size={14} className={meta.tint} />
        <span className="text-xs font-medium text-slate-300">{meta.label}</span>
        {subtitle && (
          <span className="font-mono text-[11px] text-slate-500">· {subtitle}</span>
        )}
        <ChevronDown
          size={14}
          className={`ml-auto text-slate-500 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <pre className="max-h-72 overflow-auto border-t border-white/5 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
          {JSON.stringify(step, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function TraceDrawer({ trace }) {
  const [open, setOpen] = useState(false)
  if (!trace) return null
  const overridden = trace.reconciliation?.overridden

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-200"
      >
        <Cpu size={13} />
        {open ? 'Hide' : 'View'} agent trace
        <ChevronDown size={13} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-3 animate-fade-up space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Metric icon={Cpu} label="Tokens" value={trace.total_tokens ?? 0} tint="text-indigo-300" />
            <Metric icon={Timer} label="Latency" value={`${trace.latency_ms ?? 0} ms`} tint="text-emerald-300" />
            <Metric icon={RefreshCw} label="Retries" value={trace.retries ?? 0} tint="text-amber-300" />
          </div>

          {trace.attack_detected && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              <ShieldAlert size={14} className="mt-0.5 shrink-0" />
              <div>
                <div className="font-medium">
                  Prompt-injection attempt flagged
                  {trace.injection_screen?.category && trace.injection_screen.category !== 'none'
                    ? ` · ${trace.injection_screen.category.replace(/_/g, ' ')}`
                    : ''}
                  {trace.injection_screen?.source ? ` (${trace.injection_screen.source})` : ''}
                </div>
                {trace.injection_screen?.rationale && (
                  <div className="mt-0.5 text-rose-200/70">{trace.injection_screen.rationale}</div>
                )}
              </div>
            </div>
          )}
          {trace.condition_flagged && (
            <div className="flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
              🏷️ Condition self-reported as “new” — flagged for audit.
            </div>
          )}
          {overridden && (
            <div className="flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
              <Scale size={14} /> Policy engine overrode the model’s decision.
            </div>
          )}

          <div className="space-y-1.5">
            {(trace.steps || []).map((s, i) => (
              <Step key={i} step={s} index={i + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
