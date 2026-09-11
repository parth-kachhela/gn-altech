import type { HeatRecord } from '@/types'
import { normalizeSectionKey } from '@/lib/permissions'

export type DeptKey = 'CHEMICAL' | 'MICRO' | 'TENSILE' | 'HARDNESS'
export type DeptState = 'COMPLETED' | 'PENDING' | 'NEEDS_REVIEW'

function deptReport(heat: HeatRecord, dept: DeptKey) {
  return (heat.reports ?? []).find((r) => normalizeSectionKey(r.sectionKey) === dept)
}

export function deptStateForHeat(heat: HeatRecord, dept: DeptKey): DeptState {
  const report = deptReport(heat, dept)
  if (report && report.confirmed && report.parsedValues.length > 0) return 'COMPLETED'
  if (report && !report.confirmed) return 'NEEDS_REVIEW'
  return 'PENDING'
}

export interface HeatWorkflow {
  chemical: DeptState
  micro: DeptState
  tensile: DeptState
  hardness: DeptState
  certificateReady: boolean
  certificateStatus: 'Ready' | 'Waiting'
}

export function getHeatWorkflow(heat: HeatRecord): HeatWorkflow {
  const chemical = deptStateForHeat(heat, 'CHEMICAL')
  const micro = deptStateForHeat(heat, 'MICRO')
  const tensile = deptStateForHeat(heat, 'TENSILE')
  const hardness = deptStateForHeat(heat, 'HARDNESS')
  const certificateReady =
    chemical === 'COMPLETED' && micro === 'COMPLETED' && tensile === 'COMPLETED' && hardness === 'COMPLETED'
  return { chemical, micro, tensile, hardness, certificateReady, certificateStatus: certificateReady ? 'Ready' : 'Waiting' }
}

export function workflowCounts(heats: HeatRecord[]) {
  let chemicalDone = 0, microPending = 0, tensilePending = 0, hardnessPending = 0, ready = 0
  for (const h of heats) {
    const w = getHeatWorkflow(h)
    if (w.chemical === 'COMPLETED') chemicalDone++
    if (w.micro !== 'COMPLETED') microPending++
    if (w.tensile !== 'COMPLETED') tensilePending++
    if (w.hardness !== 'COMPLETED') hardnessPending++
    if (w.certificateReady) ready++
  }
  return { total: heats.length, chemicalDone, microPending, tensilePending, hardnessPending, ready }
}
