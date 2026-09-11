import { parseMasterWorkbook } from '@/services/masterImport'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useAuditStore } from '@/stores/auditStore'
import { useUsersStore } from '@/stores/usersStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso } from '@/lib/id'
import type { HeatReportRequest } from '@/types'

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
 * fresh product masters from Master.xlsx and initial clean heats.
 */
export async function cleanAndReseedMaster(userName = 'Admin'): Promise<{ mastersCount: number; heatsCount: number }> {
  // 1. Clear existing records
  useUsersStore.getState().seedDefaultAccounts()
  useHeatRecordStore.setState({ heatRecords: [] })
  useCertificateStore.setState({ certificates: [] })
  useProductMasterStore.setState({ masters: [] })

  // 2. Fetch and parse fresh Master.xlsx
  const buffer = await fetchDemoWorkbook()
  const result = parseMasterWorkbook(buffer, [])

  // 3. Save all product masters
  for (const master of result.masters) {
    useProductMasterStore.getState().saveMaster({
      ...master,
      revision: 1,
      status: 'ACTIVE',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    })
  }

  // 4. Create fresh pending heats for the 4 lab reports
  const pendingHeats = [
    { sap: 'PR01CI0459CA', heat: 'G6E' },
    { sap: 'PR01CI0459CA', heat: 'GZ-56' },
    { sap: 'PR01CI0459CA', heat: 'GZ-1026' },
  ]

  const FOUR_SECTIONS = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
  const SECTION_NAMES: Record<string, string> = {
    CHEMICAL: 'Chemical Analysis',
    MICRO: 'Micro Structure',
    TENSILE: 'Tensile',
    HARDNESS: 'Hardness',
  }

  for (const ph of pendingHeats) {
    const id = useHeatRecordStore.getState().addHeatRecord({
      sapNo: ph.sap,
      heatCode: ph.heat,
      heats: [],
      demoReports: {},
    })

    const requests: HeatReportRequest[] = FOUR_SECTIONS.map((secKey) => ({
      id: createId(),
      sectionKey: secKey,
      sectionName: SECTION_NAMES[secKey],
      department: departmentForSectionKey(secKey),
      status: 'PENDING',
    }))

    useHeatRecordStore.setState((prev) => ({
      heatRecords: prev.heatRecords.map((h) =>
        h.id === id
          ? {
              ...h,
              requests,
              reports: [],
            }
          : h,
      ),
    }))
  }

  useAuditStore.getState().addLog({
    userId: userName,
    action: 'database_cleaned_and_reseeded',
    entityType: 'PRODUCT_MASTER',
    after: { masters: result.masters.length, heats: pendingHeats.length },
  })

  return {
    mastersCount: result.masters.length,
    heatsCount: pendingHeats.length,
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
