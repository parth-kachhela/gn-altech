import { seedDeptDemo } from '@/data/deptDemoSeed'
import { useAuditStore } from '@/stores/auditStore'

const DEMO_WORKBOOK_URL = `${import.meta.env.BASE_URL}demo-data/GN_Altech_Demo_Master.xlsx`

export interface SeedOutcome {
  added: number
  updated: number
  revisions: number
  heatsAdded: number
  heatsUpdated: number
}

export async function fetchDemoWorkbook(): Promise<ArrayBuffer> {
  const res = await fetch(DEMO_WORKBOOK_URL)
  if (!res.ok) throw new Error(`Failed to load demo workbook (${res.status})`)
  return res.arrayBuffer()
}

/**
 * Completely clears database state (masters, heats, certificates) and reseeds
 * genuine product masters from Master.xlsx and varied demo heats with samples A/B/C/D.
 */
export async function cleanAndReseedMaster(userName = 'Admin'): Promise<{ mastersCount: number; heatsCount: number }> {
  const result = seedDeptDemo(userName)

  useAuditStore.getState().addLog({
    userId: userName,
    action: 'database_cleaned_and_reseeded',
    entityType: 'PRODUCT_MASTER',
    after: { masters: result.masters, heats: result.heats },
  })

  return {
    mastersCount: result.masters,
    heatsCount: result.heats,
  }
}

export async function seedDemoMaster(userName: string): Promise<SeedOutcome> {
  const outcome = await cleanAndReseedMaster(userName)
  return {
    added: outcome.mastersCount,
    updated: 0,
    revisions: 0,
    heatsAdded: outcome.heatsCount,
    heatsUpdated: 0,
  }
}
