import { useState } from 'react'
import { Lock, KeyRound, X, Loader2 } from 'lucide-react'
import { adminLogin, adminChangePassword } from '../api'

export function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError(''); setBusy(true)
    try {
      await adminLogin(password)
      setPassword('')
      onSuccess()
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm">
      <div className="glass rounded-2xl p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white">
            <Lock size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-slate-100">Admin sign-in</h2>
            <p className="text-xs text-slate-400">This dashboard is password protected.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}

export function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (next !== confirm) { setError('New password and confirmation do not match.'); return }
    if (next.length < 8) { setError('New password must be at least 8 characters.'); return }
    setBusy(true)
    try {
      await adminChangePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-sm rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-slate-100">
            <KeyRound size={16} className="text-indigo-300" /> Change password
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-slate-200">
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-300">Password updated. Any other open sessions have been signed out.</p>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-white/15"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {[
              { v: current, set: setCurrent, ph: 'Current password' },
              { v: next, set: setNext, ph: 'New password (min 8 chars)' },
              { v: confirm, set: setConfirm, ph: 'Confirm new password' },
            ].map((f, i) => (
              <input
                key={i}
                type="password"
                value={f.v}
                onChange={(e) => f.set(e.target.value)}
                placeholder={f.ph}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-indigo-400/50"
              />
            ))}
            {error && <p className="text-sm text-rose-300">{error}</p>}
            <button
              type="submit"
              disabled={busy || !current || !next || !confirm}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy && <Loader2 size={16} className="animate-spin" />}
              Update password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
