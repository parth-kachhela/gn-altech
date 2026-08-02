import type { ReportType, TestParameterRow, TestResult } from '@/types'
import { calcRowResult, isNumeric, isTextResult } from '@/lib/result'
import { createId } from '@/lib/id'

export interface ParsedReportCommon {
  customer?: string
  partName?: string
  partNo?: string
  quantity?: string
  dailyHeat?: string
  monthlyHeat?: string
  yearlyHeat?: string
  batchNo?: string
  reportNumber?: string
  reportDate?: string
}

export interface ParsedReport {
  reportType: ReportType
  values: Record<string, string>
  rows: TestParameterRow[]
  common: ParsedReportCommon
}

const KEY_VALUE_SCAN =
  /([A-Z][A-Z0-9_]{1,})=(.*?)(?=\s+[A-Z][A-Z0-9_]{1,}=|$)/g

export function parseKeyValueLines(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    KEY_VALUE_SCAN.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = KEY_VALUE_SCAN.exec(line)) !== null) {
      const clean = m[2].split(/\s{2,}|:/)[0].trim()
      result[m[1]] = clean
    }
  }
  return result
}

const TYPE_MARKERS: Array<{ type: ReportType; markers: string[] }> = [
  {
    type: 'CHEMICAL',
    markers: ['CHEMICAL_ANALYSIS', 'CHEMICAL ANALYSIS'],
  },
  {
    type: 'MECHANICAL',
    markers: ['MECHANICAL_PROPERTIES', 'MECHANICAL PROPERTIES'],
  },
  {
    type: 'MICRO_STRUCTURE',
    markers: ['MICRO_STRUCTURE', 'MICRO STRUCTURE'],
  },
]

export function detectReportType(
  values: Record<string, string>,
  text: string,
): ReportType {
  const raw = (values.REPORT_TYPE ?? '').toUpperCase()
  if (raw.includes('CHEMICAL')) return 'CHEMICAL'
  if (raw.includes('MECHANICAL')) return 'MECHANICAL'
  if (raw.includes('MICRO')) return 'MICRO_STRUCTURE'
  const upper = text.toUpperCase()
  for (const entry of TYPE_MARKERS) {
    if (entry.markers.some((m) => upper.includes(m))) return entry.type
  }
  return 'CHEMICAL'
}

const COMMON_LABELS: Array<{ label: string; key: keyof ParsedReportCommon }> = [
  { label: 'Customer', key: 'customer' },
  { label: 'Part Name', key: 'partName' },
  { label: 'Part No.', key: 'partNo' },
  { label: 'Quantity', key: 'quantity' },
  { label: 'Batch No.', key: 'batchNo' },
  { label: 'Daily Heat No.', key: 'dailyHeat' },
  { label: 'Report No.', key: 'reportNumber' },
  { label: 'Report Date', key: 'reportDate' },
]

const ELEMENTS: Array<{ label: string; key: string }> = [
  { label: 'Carbon (C)', key: 'C_PERCENT' },
  { label: 'Silicon (Si)', key: 'SI_PERCENT' },
  { label: 'Manganese (Mn)', key: 'MN_PERCENT' },
  { label: 'Phosphorus (P)', key: 'P_PERCENT' },
  { label: 'Sulphur (S)', key: 'S_PERCENT' },
  { label: 'Chromium (Cr)', key: 'CR_PERCENT' },
  { label: 'Magnesium (Mg)', key: 'MG_PERCENT' },
  { label: 'Copper (Cu)', key: 'CU_PERCENT' },
  { label: 'Tin (Sn)', key: 'SN_PERCENT' },
  { label: 'Molybdenum (Mo)', key: 'MO_PERCENT' },
]

const MECHANICAL_LABELS: Array<{
  label: string
  key: string
  unitKey: string
}> = [
  { label: '0.2% Yield Limit', key: 'YIELD_STRENGTH', unitKey: 'YIELD_UNIT' },
  { label: 'Ultimate Tensile Strength', key: 'UTS', unitKey: 'UTS_UNIT' },
  { label: 'Elongation', key: 'ELONGATION', unitKey: 'ELONGATION_UNIT' },
  { label: 'Hardness', key: 'HARDNESS', unitKey: 'HARDNESS_UNIT' },
]

const MICRO_LABELS: Array<{ label: string; key: string }> = [
  { label: 'Average Nodularity', key: 'AVERAGE_NODULARITY' },
  { label: 'Nodule Count', key: 'NODULE_COUNT' },
  { label: 'Pearlite', key: 'PEARLITE' },
  { label: 'Ferrite', key: 'FERRITE' },
  { label: 'Carbide', key: 'CARBIDE' },
]

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

function humanValueAfterLabel(lines: string[], label: string): string {
  const idx = lines.findIndex((l) => l === label)
  if (idx !== -1 && idx + 1 < lines.length) return lines[idx + 1]
  const prefix = lines.find((l) => l.startsWith(label + ' '))
  if (prefix) {
    const rest = prefix.slice(label.length).trim()
    return rest || ''
  }
  return ''
}

function cleanCell(value: string | undefined): string | undefined {
  if (!value) return undefined
  const t = value.trim()
  if (t === '' || t === '-' || t === '--') return undefined
  return t
}

function tokenize(s: string): string[] {
  return s.split(/\s+/).filter(Boolean)
}

function cellsForLabel(
  tokens: string[],
  label: string,
): string[] | undefined {
  const labelTokens = tokenize(label)
  for (let i = 0; i + labelTokens.length + 3 <= tokens.length; i++) {
    if (!labelTokens.every((t, j) => tokens[i + j] === t)) continue
    return tokens.slice(i + labelTokens.length, i + labelTokens.length + 5)
  }
  return undefined
}

function rowsFromTable(
  lines: string[],
  labels: Array<{ label: string }>,
  values: Record<string, string>,
  keyForLabel: (label: string) => string | undefined,
  unitForKey: (key: string) => string | undefined,
): TestParameterRow[] {
  const tokens = lines.flatMap(tokenize)
  const rows: TestParameterRow[] = []
  for (const { label } of labels) {
    const key = keyForLabel(label)
    const kvObserved = key ? values[key] : undefined

    let minimum: string | undefined
    let maximum: string | undefined
    let observed: string | undefined
    let unit: string | undefined
    let status: string | undefined

    const cells = cellsForLabel(tokens, label)
    if (cells && cells.length >= 3) {
      minimum = cells[0]
      maximum = cells[1]
      observed = cells[2]
      const trailing = cells.slice(3)
      const statusIdx = trailing.findIndex((c) =>
        ['PASS', 'FAIL', 'CONDITIONAL'].includes(c.toUpperCase()),
      )
      if (statusIdx !== -1) {
        unit = trailing.slice(0, statusIdx).join(' ')
        status = trailing[statusIdx]
      } else {
        unit = trailing.join(' ')
      }
    } else {
      const idx = lines.findIndex((l) => l === label)
      if (idx !== -1) {
        const slice = lines.slice(idx + 1, idx + 5)
        ;[minimum, maximum, observed, unit] = slice
      }
    }

    const minV = cleanCell(minimum)
    const maxV = cleanCell(maximum)
    observed = kvObserved ?? cleanCell(observed)
    const unitV = cleanCell(unit) ?? (key ? unitForKey(key) : undefined)

    let result: TestResult = calcRowResult(minV, maxV, observed)
    if (isTextResult(observed) && status) {
      const s = status.toUpperCase()
      if (s === 'PASS' || s === 'FAIL') result = s
    }

    rows.push({
      id: createId(),
      label,
      minimum: minV,
      maximum: maxV,
      observed,
      unit: unitV,
      result,
    })
  }
  return rows
}

export function parseReport(text: string): ParsedReport {
  const values = parseKeyValueLines(text)
  const reportType = detectReportType(values, text)
  const lines = linesOf(text)

  const common: ParsedReportCommon = {}
  for (const { label, key } of COMMON_LABELS) {
    common[key] = humanValueAfterLabel(lines, label) || values[key] || undefined
  }
  const monthlyYearly = humanValueAfterLabel(lines, 'Monthly / Yearly Heat No.')
  if (monthlyYearly && monthlyYearly.includes('/')) {
    const parts = monthlyYearly.split('/').map((p) => p.trim())
    common.monthlyHeat = parts[0] || undefined
    common.yearlyHeat = parts[1] || undefined
  } else {
    common.monthlyHeat = values.MONTHLY_HEAT_NO || undefined
    common.yearlyHeat = values.YEARLY_HEAT_NO || undefined
  }
  if (!common.customer) common.customer = values.CUSTOMER
  if (!common.partName) common.partName = values.PART_NAME
  if (!common.partNo) common.partNo = values.PART_NO
  if (!common.quantity) common.quantity = values.QTY
  if (!common.batchNo) common.batchNo = values.BATCH_NO
  if (!common.dailyHeat) common.dailyHeat = values.DAILY_HEAT_NO

  let rows: TestParameterRow[] = []
  if (reportType === 'CHEMICAL') {
    rows = rowsFromTable(
      lines,
      ELEMENTS,
      values,
      (label) => ELEMENTS.find((e) => e.label === label)?.key,
      () => '%',
    )
  } else if (reportType === 'MECHANICAL') {
    rows = rowsFromTable(
      lines,
      MECHANICAL_LABELS,
      values,
      (label) => MECHANICAL_LABELS.find((e) => e.label === label)?.key,
      (key) => values[`${key.split('_')[0]}_UNIT`],
    )
  } else {
    rows = rowsFromTable(
      lines,
      MICRO_LABELS,
      values,
      (label) => MICRO_LABELS.find((e) => e.label === label)?.key,
      (key) => values[`${key}_UNIT`] ?? values.NODULARITY_UNIT,
    )
  }

  return { reportType, values, rows, common }
}

export function buildRowsFromParsedText(
  text: string,
  reportType: ReportType,
): TestParameterRow[] {
  const parsed = parseReport(text)
  if (parsed.reportType !== reportType) return []
  return parsed.rows
}

export function isParsedValueNumeric(v?: string): boolean {
  return isNumeric(v)
}
