import { useEffect, useRef, useState } from 'react'
import { Send, User, Package, Sparkles, Tag, CalendarDays, BadgeCheck, Boxes } from 'lucide-react'
import { getCustomers, getOrders, postRefund } from '../api'
import { DecisionBadge, Pill } from './ui'
import TraceDrawer from './TraceDrawer'

function Avatar({ who }) {
  if (who === 'user')
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-700/60 text-slate-300">
        <User size={18} />
      </div>
    )
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-900/40">
      <Sparkles size={18} />
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="flex items-center gap-2 text-slate-400">
        <Icon size={14} /> {label}
      </span>
      <span className="font-medium text-slate-200">{value}</span>
    </div>
  )
}

export default function Chat() {
  const [customers, setCustomers] = useState([])
  const [customerId, setCustomerId] = useState('')
  const [orders, setOrders] = useState([])
  const [orderId, setOrderId] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    getCustomers().then(setCustomers).catch(() => {})
  }, [])

  useEffect(() => {
    if (!customerId) return
    setOrders([])
    setOrderId('')
    setMessages([])
    getOrders(customerId).then(setOrders).catch(() => {})
  }, [customerId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const order = orders.find((o) => o.order_id === orderId)
  const customer = customers.find((c) => c.customer_id === customerId)

  async function send() {
    const text = input.trim()
    if (!text || !customerId || loading) return
    const userMsg = { role: 'user', text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    const convo = next.map((m) => ({
      role: m.role,
      content: m.role === 'assistant' && m.data ? `Decision: ${m.data.decision || ''}. ${m.text}` : m.text,
    }))

    try {
      const data = await postRefund({ customerId, orderId: orderId || null, messages: convo })
      if (data.status === 'needs_info' || !data.decision) {
        setMessages((m) => [...m, { role: 'assistant', text: data.reply || data.message || '…', trace: data.trace }])
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: data.message || data.reason || '', data, trace: data.trace },
        ])
      }
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `⚠️ Connection error: ${e.message}`, error: true }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid h-full grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="glass rounded-2xl p-5">
          <h2 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
            Control Panel
          </h2>

          <label className="mb-1.5 block text-xs font-medium text-slate-400">Customer</label>
          <select className="input-dark mb-4" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer…</option>
            {customers.map((c) => (
              <option key={c.customer_id} value={c.customer_id}>
                {c.customer_id} — {c.name}
              </option>
            ))}
          </select>

          <label className="mb-1.5 block text-xs font-medium text-slate-400">Order (optional)</label>
          <select
            className="input-dark"
            value={orderId}
            disabled={!customerId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            <option value="">Let the agent infer…</option>
            {orders.map((o) => (
              <option key={o.order_id} value={o.order_id}>
                {o.order_id} — {o.item} (${o.price})
              </option>
            ))}
          </select>
        </div>

        {order && (
          <div className="glass animate-fade-up rounded-2xl p-5">
            <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-slate-300">
              <Package size={15} className="text-indigo-300" /> Order Detail
            </h3>
            <div className="divide-y divide-white/5">
              <DetailRow icon={Boxes} label="Item" value={order.item} />
              <DetailRow icon={Tag} label="Price" value={`$${order.price}`} />
              <DetailRow icon={CalendarDays} label="Delivered" value={order.delivered_date || '—'} />
              <DetailRow icon={BadgeCheck} label="Status" value={order.status || '—'} />
              <DetailRow icon={Tag} label="Final sale" value={order.final_sale ? 'Yes' : 'No'} />
              <DetailRow icon={BadgeCheck} label="Refunded" value={order.already_refunded ? 'Yes' : 'No'} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Item condition isn’t stored — Ava asks you in chat.
            </p>
          </div>
        )}
      </aside>

      {/* Chat panel */}
      <section className="glass flex min-h-0 flex-col rounded-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/5 px-6 py-4">
          <Avatar who="assistant" />
          <div>
            <div className="font-display text-base font-semibold text-slate-100">Ava</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Refund Support · online
            </div>
          </div>
          {customer && (
            <div className="ml-auto text-right text-xs text-slate-400">
              <div className="font-medium text-slate-300">{customer.name}</div>
              <Pill>{customer.customer_id}</Pill>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-6">
          {messages.length === 0 && (
            <div className="grid h-full place-items-center text-center">
              <div className="max-w-sm">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-xl shadow-indigo-900/40">
                  <Sparkles size={26} />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-200">
                  Hi, I’m Ava 👋
                </h3>
                <p className="mt-1.5 text-sm text-slate-400">
                  {customerId
                    ? 'Tell me which order you’d like to return and why.'
                    : 'Select a customer in the control panel to start.'}
                </p>
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex animate-fade-up gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar who={m.role} />
              <div className={`max-w-[78%] ${m.role === 'user' ? 'items-end' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-500/90 to-fuchsia-500/90 text-white'
                      : m.error
                        ? 'border border-rose-400/30 bg-rose-500/10 text-rose-200'
                        : 'glass-strong text-slate-200'
                  }`}
                >
                  {m.data && (
                    <div className="mb-2">
                      <DecisionBadge decision={m.data.decision} size="lg" />
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.data && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                      <Pill>order {m.data.order_id || '—'}</Pill>
                      <Pill>{m.data.rule || '—'}</Pill>
                      {m.data.claimed_condition && <Pill>condition: {m.data.claimed_condition}</Pill>}
                    </div>
                  )}
                </div>
                {m.role === 'assistant' && m.trace && <TraceDrawer trace={m.trace} />}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex animate-fade-up gap-3">
              <Avatar who="assistant" />
              <div className="glass-strong rounded-2xl px-4 py-3.5">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-slate-400" />
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-slate-400 [animation-delay:0.2s]" />
                  <span className="h-2 w-2 animate-pulse-dot rounded-full bg-slate-400 [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/5 p-4">
          <div className="flex items-end gap-2.5">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={customerId ? 'Message Ava…' : 'Select a customer first'}
              disabled={!customerId || loading}
              className="input-dark max-h-32 flex-1 resize-none"
            />
            <button onClick={send} disabled={!input.trim() || !customerId || loading} className="btn-grad grid place-items-center">
              <Send size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
