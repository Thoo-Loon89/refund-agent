const BASE = import.meta.env.VITE_API_BASE || '/api'
const TOKEN_KEY = 'admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}

class Unauthorized extends Error {
  constructor() { super('unauthorized'); this.code = 401 }
}

async function jget(path, { auth = false } = {}) {
  const headers = {}
  if (auth) {
    const t = getToken()
    if (t) headers.Authorization = `Bearer ${t}`
  }
  const r = await fetch(`${BASE}${path}`, { headers })
  if (r.status === 401) { setToken(null); throw new Unauthorized() }
  if (!r.ok) throw new Error(`GET ${path} -> ${r.status}`)
  return r.json()
}

async function detail(r, fallback) {
  try { return (await r.json()).detail || fallback } catch { return fallback }
}

export const getCustomers = () => jget('/customers')
export const getOrders = (cid) => jget(`/customers/${cid}/orders`)

export const getMetrics = () => jget('/admin/metrics', { auth: true })
export const getLogs = () => jget('/admin/logs', { auth: true })
export const getTraces = () => jget('/admin/traces', { auth: true })
export const getAttacks = () => jget('/admin/attacks', { auth: true })
export const getSettings = () => jget('/admin/settings', { auth: true })

export async function updateSettings(patch) {
  const t = getToken()
  const r = await fetch(`${BASE}/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify(patch),
  })
  if (r.status === 401) { setToken(null); throw new Unauthorized() }
  if (!r.ok) throw new Error(await detail(r, 'Could not update settings.'))
  return r.json()
}

export async function adminLogin(password) {
  const r = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!r.ok) throw new Error(await detail(r, 'Login failed.'))
  const data = await r.json()
  setToken(data.token)
  return data
}

export async function adminLogout() {
  const t = getToken()
  if (t) {
    try {
      await fetch(`${BASE}/admin/logout`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}` },
      })
    } catch {}
  }
  setToken(null)
}

export async function adminChangePassword(currentPassword, newPassword) {
  const t = getToken()
  const r = await fetch(`${BASE}/admin/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  if (!r.ok) throw new Error(await detail(r, 'Could not change password.'))
  const data = await r.json()
  setToken(data.token)
  return data
}

export async function postRefund({ customerId, orderId, messages }) {
  const r = await fetch(`${BASE}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customer_id: customerId, order_id: orderId, messages }),
  })
  if (!r.ok) throw new Error(`POST /refund -> ${r.status}`)
  return r.json()
}
