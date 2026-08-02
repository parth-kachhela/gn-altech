import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Item } from '@/types'
import { createId, nowIso } from '@/lib/id'
import { DEMO_PARTS } from '@/data/demo'

interface ItemState {
  hasHydrated: boolean
  items: Item[]
  setHasHydrated: (value: boolean) => void
  getItem: (id: string) => Item | undefined
  getItems: () => Item[]
  addItem: (input: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateItem: (id: string, patch: Partial<Item>) => void
  deleteItem: (id: string) => void
  searchItems: (query: string) => Item[]
  seedDemoData: () => void
}

function createItem(input: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Item {
  const now = nowIso()
  return {
    ...input,
    id: createId(),
    createdAt: now,
    updatedAt: now,
  }
}

export const useItemStore = create<ItemState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      items: [],
      setHasHydrated: (value) => set({ hasHydrated: value }),
      getItem: (id) => get().items.find((i) => i.id === id),
      getItems: () => get().items,
      addItem: (input) => {
        const item = createItem(input)
        set((state) => ({ items: [item, ...state.items] }))
        return item.id
      },
      updateItem: (id, patch) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, ...patch, updatedAt: nowIso() } : i,
          ),
        })),
      deleteItem: (id) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        })),
      searchItems: (query) => {
        const q = query.toLowerCase().trim()
        if (!q) return get().items
        return get().items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.partNumber.toLowerCase().includes(q) ||
            i.material.toLowerCase().includes(q) ||
            i.grade.toLowerCase().includes(q),
        )
      },
      seedDemoData: () => {
        const current = get().items
        if (current.length > 0) return
        const now = nowIso()
        set({
          items: DEMO_PARTS.map((p) => ({
            id: p.id,
            name: p.name,
            partNumber: p.partNumber,
            material: p.material,
            grade: p.grade,
            description: '',
            unit: 'Nos.',
            createdAt: now,
            updatedAt: now,
          })),
        })
      },
    }),
    {
      name: 'gn-alt-items',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)