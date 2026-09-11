import { LAB_DEMO_MANIFEST } from '@/data/labDemoManifest'
import { processOneFile, type IngestOutcome } from '@/services/bulkIngest'
import { groupBySapHeat, nextSampleLabels } from '@/lib/sampleSplit'
import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useAuditStore } from '@/stores/auditStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso } from '@/lib/id'

const BASE = `${import.meta.env.BASE_URL}demo-data/lab-reports`
const FOUR = ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const
const NAMES: Record<string, string> = { CHEMICAL: 'Chemical Analysis', MICRO: 'Micro Structure', TENSILE: 'Tensile', HARDNESS: 'Hardness' }

export interface LabSeedOutcome {
  heats: number
  reports: number
  skipped: number
}

async function fetchAsFile(folder: string, fileName: string): Promise<File> {
  const res = await fetch(`${BASE}/${folder}/${encodeURIComponent(fileName)}`)
  if (!res.ok) throw new Error(`Missing demo file: ${folder}/${fileName}`)
  const blob = await res.blob()
  const mime = /\.bmp$/i.test(fileName) ? 'image/bmp' : /\.png$/i.test(fileName) ? 'image/png' : /\.jpe?g$/i.test(fileName) ? 'image/jpeg' : 'application/pdf'
  return new File([blob], fileName, { type: blob.type || mime })
}

interface Processed {
  entry: (typeof LAB_DEMO_MANIFEST)[number]
  file: File
  out: IngestOutcome
}

/**
 * Loads all 16 real lab files as demo heats/reports. Idempotent —
 * files already attached (matched by file name) are skipped.
 * Same-heat repeats become Sample A / B / C… via the shared rule.
 */
export async function seedLabDemoData(userName: string): Promise<LabSeedOutcome> {
  const masters = useProductMasterStore.getState().masters
  const processed: Processed[] = []
  for (const entry of LAB_DEMO_MANIFEST) {
    const file = await fetchAsFile(entry.folder, entry.file)
    const out = await processOneFile(file, entry.sectionKey, masters, () => {})
    if (!out.sapCode || !out.heatCode) continue
    processed.push({ entry, file, out })
  }

  let heats = 0
  let reports = 0
  let skipped = 0
  const now = nowIso()

  const alreadyAttached = (heatId: string, fileName: string) =>
    useHeatRecordStore.getState().heatRecords
      .find((h) => h.id === heatId)?.reports
      .some((r) => r.fileMetadata?.fileName === fileName) ?? false

  const attachReport = (
    heatId: string, sectionKey: string, p: Processed,
    sampleId?: string, sampleLabel?: string,
  ) => {
    const st = useHeatRecordStore.getState()
    st.upsertReportData(heatId, {
      id: createId(), sectionKey, sectionName: NAMES[sectionKey] ?? sectionKey,
      ...(sampleId ? { sampleId, sampleLabel } : {}),
      parsedValues: p.out.values.length > 0 ? p.out.values : [{ name: 'Result', value: 'As per report' }],
      confirmed: true, warnings: p.out.result?.warnings ?? [],
      fileMetadata: { fileName: p.file.name, fileSize: p.file.size, mimeType: p.file.type, storedKey: `labdemo-${p.file.name}` },
      uploadedBy: 'Demo seed', uploadedAt: now, status: 'COMPLETE' as const,
    })
  }

  const markReviewed = (heatId: string, sectionKey: string) => {
    const heat = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heatId)
    const req = heat?.requests.find((r) => r.sectionKey === sectionKey)
    if (req) {
      useHeatRecordStore.setState((prev) => ({
        heatRecords: prev.heatRecords.map((h) =>
          h.id === heatId ? { ...h, requests: h.requests.map((r) => (r.id === req.id ? { ...r, status: 'REVIEWED' as const } : r)) } : h,
        ),
      }))
    }
  }

  // Chemical first — creates the heats + department requests.
  const chemGroups = groupBySapHeat(
    processed.filter((p) => p.entry.sectionKey === 'CHEMICAL'),
    (p) => p.out.sapCode, (p) => p.out.heatCode,
  )
  for (const [, group] of chemGroups) {
    const st = useHeatRecordStore.getState()
    const sapNo = group[0].out.sapCode.toUpperCase()
    const heatCode = group[0].out.heatCode.toUpperCase()
    let heat = st.heatRecords.find(
      (h) => h.heatCode.toUpperCase() === heatCode && h.sapNo.toUpperCase() === sapNo,
    )
    if (!heat) {
      const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
      useHeatRecordStore.setState((prev) => ({
        heatRecords: prev.heatRecords.map((h) =>
          h.id === id
            ? {
                ...h,
                requests: FOUR.map((k) => ({
                  id: createId(), sectionKey: k, sectionName: NAMES[k],
                  department: departmentForSectionKey(k),
                  status: k === 'CHEMICAL' ? ('REVIEWED' as const) : ('PENDING' as const),
                })),
              }
            : h,
        ),
      }))
      heats++
      heat = useHeatRecordStore.getState().heatRecords.find((h) => h.id === id)!
    }
    if (group.length === 1) {
      const p = group[0]
      if (alreadyAttached(heat.id, p.file.name)) { skipped++; continue }
      attachReport(heat.id, 'CHEMICAL', p)
      markReviewed(heat.id, 'CHEMICAL')
      reports++
    } else {
      const labels = nextSampleLabels(heat.heats.map((s) => s.label), group.length)
      const newSamples = labels.map((label) => ({ id: createId(), label, quantity: undefined }))
      st.updateHeatRecord(heat.id, { heats: [...heat.heats, ...newSamples] })
      group.forEach((p, idx) => {
        if (alreadyAttached(heat!.id, p.file.name)) { skipped++; return }
        const s = newSamples[idx]
        attachReport(heat!.id, 'CHEMICAL', p, s.id, s.label)
        reports++
      })
      markReviewed(heat.id, 'CHEMICAL')
    }
  }

  // Micro / Tensile / Hardness — attach onto the chemical heats (create if missing).
  // Grouped by (SAP, heat, section): unique -> heat level, repeats sharing
  // SAP + heat -> Sample A / B / C… (e.g. tensile GZ-56 P-COVER + GZ-530 P FLANGE).
  const deptGroups = groupBySapHeat(
    processed.filter((x) => x.entry.sectionKey !== 'CHEMICAL'),
    (x) => `${x.out.sapCode}::${x.entry.sectionKey}`,
    (x) => x.out.heatCode,
  )
  for (const [, group] of deptGroups) {
    const st = useHeatRecordStore.getState()
    const head = group[0]
    const sapNo = head.out.sapCode.toUpperCase()
    const heatCode = head.out.heatCode.toUpperCase()
    const sectionKey = head.entry.sectionKey
    let heat = st.heatRecords.find(
      (h) => h.heatCode.toUpperCase() === heatCode && h.sapNo.toUpperCase() === sapNo,
    ) ?? st.heatRecords.find((h) => h.heatCode.toUpperCase() === heatCode)
    if (!heat) {
      const id = st.addHeatRecord({ sapNo, heatCode, heats: [], demoReports: {} })
      useHeatRecordStore.setState((prev) => ({
        heatRecords: prev.heatRecords.map((h) =>
          h.id === id
            ? {
                ...h,
                requests: FOUR.map((k) => ({
                  id: createId(), sectionKey: k, sectionName: NAMES[k],
                  department: departmentForSectionKey(k),
                  status: k === sectionKey ? ('REVIEWED' as const) : ('PENDING' as const),
                })),
              }
            : h,
        ),
      }))
      heats++
      heat = useHeatRecordStore.getState().heatRecords.find((h) => h.id === id)!
    }
    if (group.length === 1) {
      const p = group[0]
      if (alreadyAttached(heat.id, p.file.name)) { skipped++; }
      else {
        attachReport(heat.id, sectionKey, p)
        markReviewed(heat.id, sectionKey)
        reports++
      }
    } else {
      const fresh = useHeatRecordStore.getState().heatRecords.find((h) => h.id === heat!.id)!
      const labels = nextSampleLabels(fresh.heats.map((s) => s.label), group.length)
      const newSamples = labels.map((label) => ({ id: createId(), label, quantity: undefined }))
      st.updateHeatRecord(heat.id, { heats: [...fresh.heats, ...newSamples] })
      group.forEach((p, idx) => {
        if (alreadyAttached(heat!.id, p.file.name)) { skipped++; return }
        const s = newSamples[idx]
        attachReport(heat!.id, sectionKey, p, s.id, s.label)
        reports++
      })
      markReviewed(heat.id, sectionKey)
    }
  }

  useAuditStore.getState().addLog({
    userId: userName, action: 'lab_demo_seeded', entityType: 'SYSTEM',
    after: { heats, reports, skipped },
  })
  return { heats, reports, skipped }
}
