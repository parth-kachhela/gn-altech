import type { MasterSection, ParsedValue } from '@/types'
import { isNumeric } from '@/lib/numeric'

export function suggestValueForParameter(
  ruleType: string,
  min?: string,
  max?: string,
  expectedValue?: string,
): string {
  switch (ruleType) {
    case 'Range': {
      const lo = isNumeric(min) ? Number(min) : undefined
      const hi = isNumeric(max) ? Number(max) : undefined
      if (lo !== undefined && hi !== undefined) {
        const mid = (lo + hi) / 2
        const spread = (hi - lo) * 0.12
        const val = mid + (Math.random() * 2 - 1) * spread
        return String(roundTo(val, 2))
      }
      if (lo !== undefined) return String(roundTo(lo * 1.05, 2))
      if (hi !== undefined) return String(roundTo(hi * 0.95, 2))
      return ''
    }
    case 'Minimum': {
      const lo = isNumeric(min) ? Number(min) : undefined
      if (lo === undefined) return ''
      return String(roundTo(lo * 1.06, 2))
    }
    case 'Maximum': {
      const hi = isNumeric(max) ? Number(max) : undefined
      if (hi === undefined) return ''
      return String(roundTo(hi * 0.94, 2))
    }
    case 'ExactNumber':
      return expectedValue ?? ''
    case 'ExactText':
      return expectedValue ?? ''
    default:
      return ''
  }
}

export function suggestValuesForSection(section: MasterSection): ParsedValue[] {
  const values: ParsedValue[] = []
  for (const p of section.parameters) {
    const suggested = suggestValueForParameter(p.ruleType, p.min, p.max, p.expectedValue)
    if (!suggested) continue
    values.push({
      name: p.name,
      normalizedName: p.name.toLowerCase(),
      value: suggested,
      unit: p.unit,
      confidence: 0,
    })
  }
  return values
}

function roundTo(n: number, digits: number): number {
  const factor = Math.pow(10, digits)
  return Math.round(n * factor) / factor
}
