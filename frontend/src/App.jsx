import { useState } from 'react'
import { MessagesSquare, LayoutDashboard, Sparkles } from 'lucide-react'
import Chat from './components/Chat'
import Admin from './components/Admin'

function Tab({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
        active ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <Icon size={16} />
      {children}
    </button>
  )
}

export default function App() {
  const [tab, setTab] = useState('chat')

  return (
    <div className="mx-auto flex h-screen max-w-[1400px] flex-col px-5 py-5">
      {/* Top bar */}
      <header className="mb-5 flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-900/40">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight text-white">Ava</h1>
            <p className="text-xs text-slate-400">AI Refund Agent</p>
          </div>
        </div>

        <nav className="ml-6 flex items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          <Tab active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessagesSquare}>
            Chat
          </Tab>
          <Tab active={tab === 'admin'} onClick={() => setTab('admin')} icon={LayoutDashboard}>
            Admin
          </Tab>
        </nav>

        <div className="ml-auto hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-mono">gpt-4o-mini</span>
          <span className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
            deterministic policy engine
          </span>
        </div>
      </header>

      {/* Body */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'chat' ? <Chat /> : <Admin />}
      </main>
    </div>
  )
}
