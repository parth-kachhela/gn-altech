import { useEffect, useState } from 'react'

const KEY = 'gn-alt-server-url'
export const DEFAULT_SERVER_URL = 'http://localhost:4000'

export function getServerUrl(): string {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_SERVER_URL
  } catch {
    return DEFAULT_SERVER_URL
  }
}

export function setServerUrl(url: string) {
  try {
    localStorage.setItem(KEY, url)
  } catch { /* ignore */ }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getServerUrl().replace(/\/$/, '')
  const token = (() => {
    try { return sessionStorage.getItem('gn-alt-server-token') ?? '' } catch { return '' }
  })()
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers ?? {}) },
  })
  if (!res.ok) throw new Error(`Server ${res.status}`)
  return res.json() as Promise<T>
}

export const api = {
  health: () => req<{ ok: boolean; users: number; heats: number }>('/api/health'),
  login: async (username: string, password: string) => {
    const out = await req<{ token: string; user: { name: string; username: string; role: string; department?: string } }>('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ username, password }),
    })
    try { sessionStorage.setItem('gn-alt-server-token', out.token) } catch { /* ignore */ }
    return out
  },
  listHeats: () => req<unknown[]>('/api/heats'),
  listMasters: () => req<unknown[]>('/api/masters'),
}

export function useServerHealth() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  useEffect(() => {
    let alive = true
    api.health().then(() => alive && setStatus('online')).catch(() => alive && setStatus('offline'))
    const t = setInterval(() => {
      api.health().then(() => alive && setStatus('online')).catch(() => alive && setStatus('offline'))
    }, 15000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  return status
}
