import { useProductMasterStore } from '@/stores/productMasterStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useAuditStore } from '@/stores/auditStore'
import { useUsersStore } from '@/stores/usersStore'
import { departmentForSectionKey } from '@/lib/permissions'
import { createId, nowIso } from '@/lib/id'

const SAPS = [
  { sap: 'SAP-10025', part: 'PH-801', desc: 'Ductile Iron Pump Housing', material: 'SG Iron', customer: 'Apex Engineering', grade: 'IS 1865 SG 500/7' },
  { sap: 'SAP-10026', part: 'VF-202', desc: 'Valve Body DN100', material: 'WCB Steel', customer: 'Flowtech Valves', grade: 'ASTM A216 WCB' },
  { sap: 'SAP-10027', part: 'GB-310', desc: 'Gearbox Housing', material: 'Grey Iron', customer: 'Shakti Gears', grade: 'IS 210 FG260' },
  { sap: 'SAP-10031', part: 'BR-118', desc: 'Bearing Bracket', material: 'SG Iron', customer: 'Apex Engineering', grade: 'IS 1865 SG 400/12' },
  { sap: 'SAP-10042', part: 'PM-550', desc: 'Pump Impeller', material: 'SS304', customer: 'Aqua Pumps', grade: 'ASTM A351 CF8' },
  { sap: 'SAP-10055', part: 'FL-090', desc: 'Flange 150#', material: 'Carbon Steel', customer: 'Flowtech Valves', grade: 'ASTM A105' },
]

function chemVals(seed: number) {
  const els = ['C', 'Si', 'Mn', 'P', 'S', 'Cr', 'Mg', 'Cu', 'Sn', 'Mo']
  const base = [3.07, 1.7, 0.74, 0.057, 0.08, 0.32, 0.045, 0.576, 0.046, 0.0]
  return els.map((e, i) => ({ name: e, value: (base[i] + ((seed % 5) - 2) * 0.01).toFixed(3), unit: '%', confidence: 0.9 }))
}
const microVals = () => [
  { name: 'Nodularity', value: '85', unit: '%' },
  { name: 'Nodule Count', value: '180', unit: '/mm2' },
  { name: 'Pearlite', value: '40', unit: '%' },
  { name: 'Ferrite', value: '60', unit: '%' },
  { name: 'Carbide', value: 'NIL', unit: '' },
]
const tensileVals = (seed: number) => [
  { name: 'Yield Strength', value: String(318 + (seed % 7)), unit: 'N/mm2' },
  { name: 'UTS', value: String(515 + (seed % 9)), unit: 'N/mm2' },
  { name: 'Elongation', value: (8 + (seed % 4) * 0.3).toFixed(1), unit: '%' },
]
const hardnessVals = (seed: number) => [{ name: 'Hardness', value: String(235 + (seed % 8)), unit: 'BHN' }]

export function seedDeptDemo(userName = 'Demo'): { heats: number; masters: number } {
  useUsersStore.getState().seedDefaultAccounts()
  const pm = useProductMasterStore.getState()
  const hr = useHeatRecordStore.getState()
  if (hr.heatRecords.length > 0 && pm.masters.length > 0) return { heats: hr.heatRecords.length, masters: pm.masters.length }
  const now = nowIso()

  for (const s of SAPS) {
    if (!pm.getActiveMasterBySap(s.sap)) {
      pm.saveMaster({
        id: createId(), sapNo: s.sap, partNo: s.part, description: s.desc, material: s.material,
        customer: s.customer, grade: s.grade, revision: 1, status: 'ACTIVE',
        sections: [
          { id: createId(), name: 'Chemical Analysis', key: 'CHEMICAL', required: true, order: 0, parameters: chemVals(1).map((v, i) => ({ id: createId(), name: v.name, aliases: [], ruleType: 'Informational' as const, unit: v.unit, required: false, order: i })) },
          { id: createId(), name: 'Micro Structure', key: 'MICRO', required: true, order: 1, parameters: microVals().map((v, i) => ({ id: createId(), name: v.name, aliases: [], ruleType: 'Informational' as const, unit: v.unit, required: false, order: i })) },
          { id: createId(), name: 'Tensile', key: 'TENSILE', required: true, order: 2, parameters: tensileVals(1).map((v, i) => ({ id: createId(), name: v.name, aliases: [], ruleType: 'Informational' as const, unit: v.unit, required: false, order: i })) },
          { id: createId(), name: 'Hardness', key: 'HARDNESS', required: true, order: 3, parameters: hardnessVals(1).map((v, i) => ({ id: createId(), name: v.name, aliases: [], ruleType: 'Informational' as const, unit: v.unit, required: false, order: i })) },
        ],
        createdAt: now, updatedAt: now,
      })
    }
  }

  const plan: Array<{ sap: string; heat: string; done: string[] }> = [
    { sap: 'SAP-10025', heat: 'HEAT-2026-001', done: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] },
    { sap: 'SAP-10025', heat: 'HEAT-2026-002', done: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] },
    { sap: 'SAP-10026', heat: 'HEAT-2026-003', done: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] },
    { sap: 'SAP-10027', heat: 'HEAT-2026-004', done: ['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] },
    { sap: 'SAP-10025', heat: 'HEAT-2026-005', done: ['CHEMICAL', 'MICRO', 'HARDNESS'] },
    { sap: 'SAP-10026', heat: 'HEAT-2026-006', done: ['CHEMICAL', 'HARDNESS'] },
    { sap: 'SAP-10031', heat: 'HEAT-2026-007', done: ['CHEMICAL', 'MICRO'] },
    { sap: 'SAP-10042', heat: 'HEAT-2026-008', done: ['CHEMICAL'] },
    { sap: 'SAP-10055', heat: 'HEAT-2026-009', done: ['CHEMICAL'] },
    { sap: 'SAP-10031', heat: 'HEAT-2026-010', done: ['CHEMICAL'] },
    { sap: 'SAP-10025', heat: 'HEAT-2026-011', done: ['CHEMICAL', 'MICRO', 'TENSILE'] },
    { sap: 'SAP-10026', heat: 'HEAT-2026-012', done: ['CHEMICAL', 'TENSILE', 'HARDNESS'] },
  ]
  const names: Record<string, string> = { CHEMICAL: 'Chemical Analysis', MICRO: 'Micro Structure', TENSILE: 'Tensile', HARDNESS: 'Hardness' }
  const vals: Record<string, (s: number) => { name: string; value: string; unit?: string }[]> = {
    CHEMICAL: chemVals, MICRO: () => microVals(), TENSILE: tensileVals, HARDNESS: hardnessVals,
  }
  plan.forEach((p, idx) => {
    const id = hr.addHeatRecord({ sapNo: p.sap, heatCode: p.heat, heats: [], demoReports: {} })
    useHeatRecordStore.setState((prev) => ({
      heatRecords: prev.heatRecords.map((h) =>
        h.id === id
          ? {
              ...h,
              reports: p.done.map((k) => ({
                id: createId(), sectionKey: k, sectionName: names[k],
                parsedValues: vals[k](idx + 1).map((v) => ({ ...v, confidence: 0.9 })),
                confirmed: true, warnings: [],
                fileMetadata: { fileName: `${k.toLowerCase()}_${p.heat}.pdf`, fileSize: 42000, mimeType: 'application/pdf', storedKey: `demo-${p.heat}-${k}` },
                uploadedBy: k === 'CHEMICAL' ? 'Chemical Operator' : `${k} Operator`,
                uploadedAt: now, status: 'COMPLETE' as const,
              })),
              requests: (['CHEMICAL', 'MICRO', 'TENSILE', 'HARDNESS'] as const).map((k) => ({
                id: createId(), sectionKey: k, sectionName: names[k],
                department: departmentForSectionKey(k),
                status: p.done.includes(k) ? ('REVIEWED' as const) : ('PENDING' as const),
              })),
            }
          : h,
      ),
    }))
  })

  const cert = useCertificateStore.getState()
  if (cert.certificates.length === 0) {
    const master = useProductMasterStore.getState().getActiveMasterBySap('SAP-10025')!
    const heat = useHeatRecordStore.getState().heatRecords.find((h) => h.heatCode === 'HEAT-2026-001')!
    const cid = cert.createDraft('TC-2026-000184', '28.07.2026')
    cert.setProductSnapshot(cid, master)
    const secByKey = new Map(master.sections.map((s) => [s.key, s]))
    cert.addHeatSelection(cid, {
      id: createId(), heatRecordId: heat.id, heatCode: heat.heatCode,
      heatCodeOnly: true, includeHeatLevel: true, selectedSamples: [],
      reportRecords: heat.reports.map((r) => {
        const sec = secByKey.get(r.sectionKey)!
        return { id: createId(), sectionId: sec.id, sectionKey: sec.key, sectionName: sec.name, parsedValues: r.parsedValues, confirmed: true, sourceType: 'DEPARTMENT', warnings: [], status: 'COMPLETE', uploadedBy: r.uploadedBy, uploadedAt: r.uploadedAt }
      }),
    })
    cert.markReviewed(cid)
    cert.issueCertificate(cid)
  }
  useAuditStore.getState().addLog({ userId: userName, action: 'dept_demo_seeded', entityType: 'SYSTEM', after: { heats: 12 } })
  return { heats: 12, masters: SAPS.length }
}
