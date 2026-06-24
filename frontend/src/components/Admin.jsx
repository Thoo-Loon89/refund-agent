import { useEffect, useState } from 'react'
import {
  BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, LineChart, Line, CartesianGrid,
} from 'recharts'
import {
  Activity, CheckCircle2, XCircle, AlertTriangle, ShieldAlert, Cpu, Timer, RefreshCw, HelpCircle, Tag,
  KeyRound, LogOut,
} from 'lucide-react'
import { getMetrics, getLogs, getTraces, getAttacks, getToken, adminLogout } from '../api'
import { DecisionBadge } from './ui'
import TraceDrawer from './TraceDrawer'
import { AdminLogin, ChangePasswordModal } from './AdminAuth'

const DEC_COLOR = { APPROVE: '#34d399', DENY: '#fb7185', ESCALATE: '#fbbf24', NEEDS_INFO: '#38bdf8' }

function Kpi({ icon: Icon, label, value, tint }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon size={15} className={tint} />
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <div className="font-display text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  )
}

export default function Admin() {
  const [metrics, setMetrics] = useState({})
  const [logs, setLogs] = useState([])
  const [traces, setTraces] = useState([])
  const [attacks, setAttacks] = useState({ total_attacks: 0, attacks: [] })
  const [selected, setSelected] = useState(null)
  const [auto, setAuto] = useState(false)
  const [authed, setAuthed] = useState(Boolean(getToken()))
  const [showChangePw, setShowChangePw] = useState(false)

  async function refresh() {
    try {
      const [m, l, t, a] = await Promise.all([getMetrics(), getLogs(), getTraces(), getAttacks()])
      setMetrics(m); setLogs(l); setTraces(t); setAttacks(a)
      setAuthed(true)
    } catch (e) {
      if (e.code === 401) setAuthed(false)
    }
  }

  async function logout() {
    await adminLogout()
    setAuthed(false)
  }

  useEffect(() => { if (authed) refresh() }, [authed])
  useEffect(() => {
    if (!auto || !authed) return
    const id = setInterval(refresh, 3000)
    return () => clearInterval(id)
  }, [auto, authed])

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  const dist = ['APPROVE', 'DENY', 'ESCALATE', 'NEEDS_INFO']
    .map((k) => ({ name: k, value: logs.filter((x) => x.decision === k).length }))
    .filter((d) => d.value > 0)
  const latency = logs.slice().reverse().map((x, i) => ({ i: i + 1, ms: x.latency_ms || 0 }))
  const trace = traces.find((t) => t.request_id === selected)

  return (
    <div className="space-y-5">
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-100">Observability</h2>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} className="accent-indigo-500" />
            Auto-refresh
          </label>
          <button onClick={refresh} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
            Refresh now
          </button>
          <button onClick={() => setShowChangePw(true)} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
            <KeyRound size={13} /> Change password
          </button>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10">
            <LogOut size={13} /> Log out
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Kpi icon={Activity} label="Requests" value={metrics.total_requests ?? 0} tint="text-indigo-300" />
        <Kpi icon={CheckCircle2} label="Approve" value={metrics.approve ?? 0} tint="text-emerald-300" />
        <Kpi icon={XCircle} label="Deny" value={metrics.deny ?? 0} tint="text-rose-300" />
        <Kpi icon={AlertTriangle} label="Escalate" value={metrics.escalate ?? 0} tint="text-amber-300" />
        <Kpi icon={HelpCircle} label="Needs info" value={metrics.needs_info ?? 0} tint="text-sky-300" />
        <Kpi icon={ShieldAlert} label="Attacks" value={metrics.attacks_blocked ?? 0} tint="text-rose-300" />
        <Kpi icon={Tag} label="Cond. flags" value={metrics.condition_flags ?? 0} tint="text-sky-300" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={CheckCircle2} label="Approval rate" value={`${metrics.approval_rate ?? 0}%`} tint="text-emerald-300" />
        <Kpi icon={Cpu} label="Avg tokens" value={metrics.avg_tokens ?? 0} tint="text-indigo-300" />
        <Kpi icon={Timer} label="Avg latency" value={`${metrics.avg_latency_ms ?? 0} ms`} tint="text-emerald-300" />
        <Kpi icon={RefreshCw} label="Retries" value={metrics.total_retries ?? 0} tint="text-amber-300" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-slate-300">Decision distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dist}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip contentStyle={{ background: '#111623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {dist.map((d) => <Cell key={d.name} fill={DEC_COLOR[d.name] || '#818cf8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-4 font-display text-sm font-semibold text-slate-300">Latency per request (ms)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={latency}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="i" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: '#111623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
              <Line type="monotone" dataKey="ms" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3, fill: '#818cf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attacks */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-300">
          <ShieldAlert size={15} className="text-rose-300" /> Prompt-injection attempts
        </h3>
        {attacks.attacks?.length ? (
          <div className="space-y-2">
            {attacks.attacks.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{a.customer_id}</span>
                <span className="flex-1 truncate text-slate-300">{a.message}</span>
                {a.category && a.category !== 'none' && (
                  <span className="shrink-0 rounded-full border border-rose-400/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-200">
                    {a.category.replace(/_/g, ' ')}{a.source ? ` · ${a.source}` : ''}
                  </span>
                )}
                <DecisionBadge decision={a.decision} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-300/80">No injection attempts detected.</p>
        )}
      </div>

      {/* Logs + trace inspector */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-300">Request log</h3>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-ink-850/90 text-[11px] uppercase tracking-wide text-slate-500 backdrop-blur">
                <tr>
                  <th className="px-2 py-2">ID</th><th className="px-2 py-2">Customer</th>
                  <th className="px-2 py-2">Decision</th><th className="px-2 py-2 text-right">Tok</th>
                  <th className="px-2 py-2 text-right">ms</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr
                    key={l.request_id}
                    onClick={() => setSelected(l.request_id)}
                    className={`cursor-pointer border-t border-white/5 hover:bg-white/[0.03] ${selected === l.request_id ? 'bg-indigo-500/10' : ''}`}
                  >
                    <td className="px-2 py-2 font-mono text-xs text-slate-500">{l.request_id}</td>
                    <td className="px-2 py-2 text-slate-300">{l.customer_id}</td>
                    <td className="px-2 py-2"><DecisionBadge decision={l.decision} /></td>
                    <td className="px-2 py-2 text-right text-slate-400">{l.total_tokens}</td>
                    <td className="px-2 py-2 text-right text-slate-400">{l.latency_ms}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-8 text-center text-slate-500">No requests yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-display text-sm font-semibold text-slate-300">Trace inspector</h3>
          {trace ? (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="font-mono text-xs text-slate-500">{trace.request_id}</span>
                <DecisionBadge decision={trace.decision} />
              </div>
              <p className="mb-1 truncate text-sm text-slate-400">“{trace.message}”</p>
              {/* Force-open trace by remounting per request */}
              <TraceDrawer key={trace.request_id} trace={trace} />
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a request from the log to inspect its full trace.</p>
          )}
        </div>
      </div>
    </div>
  )
}
