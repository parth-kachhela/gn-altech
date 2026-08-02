import type { Certificate, TestParameterRow } from '@/types'
import type { ParsedReport } from '@/services/reportParser'
import { parseReport } from '@/services/reportParser'
import { useClientStore } from '@/stores/clientStore'
import { useItemStore } from '@/stores/itemStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'

function mergeRows(
  current: TestParameterRow[],
  parsed: TestParameterRow[],
): TestParameterRow[] {
  const byLabel = new Map(current.map((r) => [r.label.toLowerCase(), r]))
  const merged: TestParameterRow[] = [...current]
  for (const row of parsed) {
    const key = row.label.toLowerCase()
    const existing = byLabel.get(key)
    if (existing) {
      const index = merged.indexOf(existing)
      merged[index] = {
        ...existing,
        minimum: row.minimum ?? existing.minimum,
        maximum: row.maximum ?? existing.maximum,
        observed: row.observed ?? existing.observed,
        unit: row.unit ?? existing.unit,
        result: row.observed
          ? row.result
          : existing.result,
      }
      byLabel.set(key, merged[index])
    } else {
      merged.push(row)
      byLabel.set(key, row)
    }
  }
  return merged
}

function getClientIdByName(name: string): string | undefined {
  if (!name) return undefined
  const clients = useClientStore.getState().getClients()
  const match = clients.find((c) => c.name === name)
  return match?.id
}

function getItemIdByName(name: string): string | undefined {
  if (!name) return undefined
  const items = useItemStore.getState().getItems()
  const match = items.find((i) => i.name === name || i.partNumber === name)
  return match?.id
}

export function mergeReportIntoCertificate(
  certificate: Certificate,
  parsed: ParsedReport,
): Certificate {
  const next: Certificate = { ...certificate, reports: [...certificate.reports] }

  if (parsed.common.customer && !next.clientId) {
    const cid = getClientIdByName(parsed.common.customer)
    if (cid) next.clientId = cid
  }

  if (parsed.common.partName || parsed.common.partNo) {
    if (parsed.common.partName) {
      const itemId = getItemIdByName(parsed.common.partName)
      if (itemId && next.items.length > 0 && !next.items[0].itemId) {
        next.items[0].itemId = itemId
      }
    }
    if (parsed.common.partNo) {
      const itemId = getItemIdByName(parsed.common.partNo)
      if (itemId && next.items.length > 0) {
        if (!next.items[0].itemId) {
          next.items[0].itemId = itemId
        }
      }
    }
  }

  if (parsed.common.dailyHeat && next.heatRecords.length > 0) {
    const hr = useHeatRecordStore.getState().heatRecords.find(
      (h) => h.dailyHeatNumber === parsed.common.dailyHeat,
    )
    if (hr) {
      if (!next.heatRecords[0].heatRecordId) {
        next.heatRecords[0].heatRecordId = hr.id
        next.heatRecords[0].itemId = hr.itemId
      }
    }
  }

  if (parsed.reportType === 'CHEMICAL') {
    next.chemicalRows = mergeRows(next.chemicalRows, parsed.rows)
  } else if (parsed.reportType === 'MECHANICAL') {
    next.mechanicalRows = mergeRows(next.mechanicalRows, parsed.rows)
  } else {
    next.microStructureRows = mergeRows(next.microStructureRows, parsed.rows)
  }
  return next
}

export function resetCertificateToParsed(certificate: Certificate): Certificate {
  const next: Certificate = {
    ...certificate,
    reports: [...certificate.reports],
    items: certificate.items.map((i) => ({ ...i })),
    heatRecords: certificate.heatRecords.map((hr) => ({ ...hr })),
  }
  for (const report of certificate.reports) {
    if (report.status !== 'READY') continue
    const parsed = parseReport(report.parsedText)
    if (parsed.reportType === 'CHEMICAL') {
      next.chemicalRows = parsed.rows
    } else if (parsed.reportType === 'MECHANICAL') {
      next.mechanicalRows = parsed.rows
    } else {
      next.microStructureRows = parsed.rows
    }
    if (parsed.common.customer) {
      const cid = getClientIdByName(parsed.common.customer)
      if (cid) next.clientId = cid
    }
    if (next.items.length > 0) {
      if (parsed.common.partName) {
        const itemId = getItemIdByName(parsed.common.partName)
        if (itemId) next.items[0].itemId = itemId
      }
      if (parsed.common.dailyHeat) {
        const hr = useHeatRecordStore.getState().heatRecords.find(
          (h) => h.dailyHeatNumber === parsed.common.dailyHeat,
        )
        if (hr) {
          next.heatRecords[0].heatRecordId = hr.id
          next.heatRecords[0].itemId = hr.itemId
        }
      }
    }
  }
  return next
}
