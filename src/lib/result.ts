import type { TestParameterRow, TestResult } from '@/types'

const TEXT_VALUES = new Set([
  'NIL',
  'N/A',
  'NA',
  'DETECTED',
  'NOT DETECTED',
  'ABSENT',
  'PRESENT',
  'TEXT',
  'SATISFACTORY',
  'AS PER ATTACHED INSPECTION REPORT',
])

export function isTextResult(value?: string): boolean {
  const t = (value ?? '').trim().toUpperCase()
  return t !== '' && TEXT_VALUES.has(t)
}

export function isNumeric(value?: string): boolean {
  if (!value) return false
  const t = value.trim()
  if (t === '') return false
  return !Number.isNaN(Number(t))
}

export function calcRowResult(
  minimum?: string,
  maximum?: string,
  observed?: string,
): TestResult {
  if (!observed || observed.trim() === '') return 'PENDING'
  if (isTextResult(observed)) return 'PENDING'
  const num = Number(observed)
  if (Number.isNaN(num)) return 'PENDING'
  const min = minimum && isNumeric(minimum) ? Number(minimum) : undefined
  const max = maximum && isNumeric(maximum) ? Number(maximum) : undefined
  if (min !== undefined && num < min) return 'FAIL'
  if (max !== undefined && num > max) return 'FAIL'
  if (min !== undefined || max !== undefined) return 'PASS'
  return 'PENDING'
}

export function formatSpecified(minimum?: string, maximum?: string): string {
  const min = minimum?.trim() ?? ''
  const max = maximum?.trim() ?? ''
  if (isTextResult(min)) return min
  if (isTextResult(max)) return max
  if (isNumeric(min) && isNumeric(max)) return `${Number(min)}-${Number(max)}`
  if (isNumeric(min)) return `>= ${Number(min)}`
  if (isNumeric(max)) return `<= ${Number(max)}`
  if (min || max) return min || max
  return '--'
}

export function combineSpecified(rows: TestParameterRow[]): string {
  const parts = rows
    .map((r) => formatSpecified(r.minimum, r.maximum))
    .filter((v) => v !== '--')
  return parts.length ? parts.join(' / ') : '--'
}

export function combineObserved(rows: TestParameterRow[]): string {
  const parts = rows
    .map((r) => (r.observed ?? '').trim())
    .filter((v) => v !== '')
  return parts.length ? parts.join(' / ') : '--'
}

export function computeOverallResult(
  sections: TestParameterRow[][],
): TestResult {
  const rows = sections.flat().filter((r) => {
    const o = (r.observed ?? '').trim()
    return o !== ''
  })
  if (rows.some((r) => r.result === 'FAIL')) return 'FAIL'
  if (rows.some((r) => r.result === 'CONDITIONAL')) return 'CONDITIONAL'
  if (rows.length === 0) return 'PENDING'
  return 'PASS'
}
