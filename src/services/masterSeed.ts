import { parseMasterWorkbook } from '@/services/masterImport'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { buildDemoHeatReports } from '@/lib/demoReportFactory'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso, toDmY } from '@/lib/id'
import type { HeatRecord, HeatReportData, HeatReportRequest, HeatSample } from '@/types'

const DEMO_WORKBOOK_URL = `${import.meta.env.BASE_URL}demo-data/GN_Altech_Demo_Master.xlsx`

export interface SeedOutcome {
  added: number
  updated: number
  revisions: number
  heatsAdded: number
  heatsUpdated: number
}

const DEMO_SAMPLE_COUNTS: Record<string, number> = {
  A6A: 2,
  A6B: 4,
  A6C: 1,
  A6D: 1,
  B6A: 2,
  B6B: 1,
  B6C: 4,
  B6D: 2,
  C6A: 4,
  C6B: 2,
  C6C: 1,
  C6D: 1,
  G6E: 1,
  G6F: 2,
  G6G: 4,
  G6H: 1,
}

function demoHeatDate(index: number): string {
  const d = new Date()
  d.setDate(d.getDate() - (index % 50) - 1)
  return toDmY(d)
}

function demoSamplesFor(
  defaultSample: string | undefined,
  quantity: string | undefined,
  count: number,
): HeatSample[] {
  if (!defaultSample || count <= 0) return []
  const base = parseInt(defaultSample, 10)
  const start = Number.isNaN(base) ? 1 : base
  return Array.from({ length: count }, (_, i) => ({
    id: createId(),
    label: String(start + i).padStart(2, '0'),
    quantity,
  }))
}

export async function fetchDemoWorkbook(): Promise<ArrayBuffer> {
  const res = await fetch(DEMO_WORKBOOK_URL)
  if (!res.ok) throw new Error(`Failed to load demo workbook (${res.status})`)
  return res.arrayBuffer()
}

export async function seedDemoMaster(userName: string): Promise<SeedOutcome> {
  const masters = useProductMasterStore.getState().masters
  const buffer = await fetchDemoWorkbook()
  const result = parseMasterWorkbook(buffer, masters)

  let added = 0
  let updated = 0
  let revisions = 0

  for (const master of result.masters) {
    const meta = result.meta[master.sapNo]
    if (meta?.existing) {
      const existing = meta.existing
      if (existing.status === 'ACTIVE') {
        useProductMasterStore.getState().saveMaster({
          ...master,
          id: existing.id,
          revision: (existing.revision ?? 1) + 1,
          status: 'ACTIVE',
          createdAt: existing.createdAt,
          updatedAt: nowIso(),
        })
        updated++
      } else {
        useProductMasterStore.getState().saveMaster({
          ...master,
          id: createId(),
          revision: (existing.revision ?? 1) + 1,
          status: 'INACTIVE',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        })
        revisions++
      }
    } else {
      useProductMasterStore.getState().saveMaster({
        ...master,
        revision: 1,
        status: 'ACTIVE',
      })
      added++
    }
  }

  const heatRecords = useHeatRecordStore.getState().heatRecords
  let heatsAdded = 0
  let heatsUpdated = 0
  result.heats.forEach((heat, index) => {
    const master = useProductMasterStore.getState().getActiveMasterBySap(heat.sapNo)
    const samples = demoSamplesFor(heat.defaultSample, heat.quantity, DEMO_SAMPLE_COUNTS[heat.heatCode] ?? 1)
    const targets = samples.length > 0 ? samples : [{ id: undefined, label: undefined }]
    const requests: HeatReportRequest[] = master
      ? master.sections
          .filter((s) => s.required)
          .flatMap((section) =>
            targets.map((sample) => ({
              id: createId(),
              sectionKey: section.key,
              sectionName: section.name,
              department: departmentForSectionKey(section.key),
              sampleId: sample.id,
              sampleLabel: sample.label,
              status: 'REVIEWED' as const,
            })),
          )
      : []
    const reports: HeatReportData[] = master
      ? targets.flatMap((sample) => buildDemoHeatReports(master, sample.id, sample.label))
      : []
    const patch: Partial<HeatRecord> = {
      heatCode: heat.heatCode,
      batchNo: heat.batchNo,
      quantity: heat.quantity,
      heats: samples,
      demoReports: heat.demoReports,
      requests,
      reports,
      date: demoHeatDate(index),
    }

    const existing = heatRecords.find(
      (h) =>
        h.sapNo.toLowerCase() === heat.sapNo.toLowerCase() &&
        h.heatCode.toLowerCase() === heat.heatCode.toLowerCase(),
    )
    if (existing) {
      useHeatRecordStore.getState().updateHeatRecord(existing.id, patch)
      heatsUpdated++
    } else {
      const id = useHeatRecordStore.getState().addHeatRecord({
        sapNo: heat.sapNo,
        heatCode: heat.heatCode,
        batchNo: heat.batchNo,
        quantity: heat.quantity,
        heats: samples,
        demoReports: heat.demoReports,
      })
      useHeatRecordStore.getState().updateHeatRecord(id, patch)
      heatsAdded++
    }
  })

  useAuditStore.getState().addLog({
    userId: userName,
    action: 'master_seeded_demo',
    entityType: 'PRODUCT_MASTER',
    after: { added, updated, revisions, heatsAdded, heatsUpdated },
  })

  return { added, updated, revisions, heatsAdded, heatsUpdated }
}
