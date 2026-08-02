import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Client } from '@/types'
import { createId, nowIso } from '@/lib/id'
import { DEMO_CLIENTS } from '@/data/demo'

interface ClientState {
  hasHydrated: boolean
  clients: Client[]
  setHasHydrated: (value: boolean) => void
  getClient: (id: string) => Client | undefined
  getClients: () => Client[]
  addClient: (input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateClient: (id: string, patch: Partial<Client>) => void
  deleteClient: (id: string) => void
  searchClients: (query: string) => Client[]
  seedDemoData: () => void
}

function createClient(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Client {
  const now = nowIso()
  return {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  }
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      clients: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getClient: (id) => get().clients.find((c) => c.id === id),
      getClients: () => get().clients,
      addClient: (input) => {
        const client = createClient(input)
        set((state) => ({ clients: [client, ...state.clients] }))
        return client.id
      },
      updateClient: (id, patch) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...patch, updatedAt: nowIso() } : c,
          ),
        })),
      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
        })),
      searchClients: (query) => {
        const q = query.toLowerCase().trim()
        if (!q) return get().clients
        return get().clients.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.location?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q) ||
            c.gstin?.toLowerCase().includes(q),
        )
      },
      seedDemoData: () => {
        const current = get().clients
        if (current.length > 0) return
        const now = nowIso()
        set({
          clients: DEMO_CLIENTS.map((c) => ({
            ...c,
            createdAt: now,
            updatedAt: now,
          })),
        })
      },
    }),
    {
      name: 'gn-alt-clients',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)