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
  const isMultipart = init?.body instanceof FormData
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let msg = `Server ${res.status}`
    try {
      const err = await res.json()
      if (err?.error) msg = err.error
    } catch { /* ignore */ }
    throw new Error(msg)
  }
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
  logout: () => {
    try { sessionStorage.removeItem('gn-alt-server-token') } catch { /* ignore */ }
  },

  // Dashboard
  getDashboard: () => req<{
    totalHeats: number
    readyHeats: number
    pendingHeats: number
    issuedCertificates: number
    departmentStats: Record<string, { total: number; pending: number; reviewed: number }>
  }>('/api/dashboard'),

  // Product Masters
  listMasters: (params?: { page?: number; limit?: number; q?: string }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.q) q.set('q', params.q)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return req<{ total: number; page: number; limit: number; items: unknown[] }>(`/api/masters${qs}`)
  },
  getMaster: (id: string) => req<unknown>(`/api/masters/${id}`),
  createMaster: (data: unknown) => req<unknown>('/api/masters', { method: 'POST', body: JSON.stringify(data) }),
  updateMaster: (id: string, data: unknown) => req<unknown>(`/api/masters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Heats
  listHeats: (params?: { page?: number; limit?: number; q?: string; status?: 'ready' | 'pending' }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.q) q.set('q', params.q)
    if (params?.status) q.set('status', params.status)
    const qs = q.toString() ? `?${q.toString()}` : ''
    return req<{ total: number; page: number; limit: number; items: unknown[] }>(`/api/heats${qs}`)
  },
  getHeat: (id: string) => req<unknown>(`/api/heats/${id}`),
  createHeat: (data: { sapNo: string; heatCode: string; batchNo?: string; quantity?: string; date?: string }) =>
    req<unknown>('/api/heats', { method: 'POST', body: JSON.stringify(data) }),
  updateHeat: (id: string, data: { sapNo?: string; batchNo?: string; quantity?: string; status?: string; version?: number }) =>
    req<unknown>(`/api/heats/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  uploadHeatReport: (heatId: string, file: File, sectionKey: string) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('sectionKey', sectionKey)
    return req<unknown>(`/api/heats/${heatId}/reports`, { method: 'POST', body: fd })
  },
  bulkUploadReports: (files: File[], sectionKey: string) => {
    const fd = new FormData()
    files.forEach((f) => fd.append('files', f))
    fd.append('sectionKey', sectionKey)
    return req<{ results: unknown[] }>('/api/heats/bulk-reports', { method: 'POST', body: fd })
  },

  // Certificates
  listCertificates: (params?: { page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString() ? `?${q.toString()}` : ''
    return req<{ total: number; page: number; limit: number; items: unknown[] }>(`/api/certificates${qs}`)
  },
  createCertificateFromHeat: (heatId: string) =>
    req<unknown>(`/api/certificates/from-heat/${heatId}`, { method: 'POST' }),

  // Users
  listUsers: () => req<unknown[]>('/api/users'),
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
