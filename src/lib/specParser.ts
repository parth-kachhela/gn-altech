import type { RuleType } from '@/types'

export interface ParsedSpec {
  ruleType: RuleType
  min?: string
  max?: string
  expectedValue?: string
  unit?: string
  sourceText: string
  warning?: string
}

const NUM = /-?\d+(?:\.\d+)?/
const DASH = /^[-–—]+$/

function extractUnit(rest: string): string | undefined {
  if (!rest) return undefined
  if (/%/.test(rest)) return '%'
  if (/N\s*\/\s*mm2|N\/mm2/i.test(rest)) return 'N/mm2'
  if (/MPa/i.test(rest)) return 'MPa'
  if (/BHN/i.test(rest)) return 'BHN'
  if (/mm2/i.test(rest)) return 'mm2'
  const m = rest.match(/[A-Za-z]+/)
  return m ? m[0] : undefined
}

export function parseSpecification(raw: string): ParsedSpec {
  const sourceText = raw.trim()
  if (!sourceText || DASH.test(sourceText)) {
    return { ruleType: 'Informational', sourceText }
  }

  const s = sourceText.replace(/\s+/g, ' ')

  const range = s.match(new RegExp(`(${NUM.source})\\s*[-–]\\s*(${NUM.source})(.*)`, 'i'))
  if (range) {
    return {
      ruleType: 'Range',
      min: range[1],
      max: range[2],
      unit: extractUnit(range[3]),
      sourceText,
    }
  }

  const minMatch = s.match(
    new RegExp(`(${NUM.source})\\s*%?\\s*(Min|Min\\.|Minimum)(.*)`, 'i'),
  )
  if (minMatch) {
    return {
      ruleType: 'Minimum',
      min: minMatch[1],
      unit: extractUnit((minMatch[2] ?? '') + (minMatch[3] ?? '')),
      sourceText,
    }
  }

  const maxMatch = s.match(
    new RegExp(`(${NUM.source})\\s*%?\\s*(Max|Max\\.|Maximum)(.*)`, 'i'),
  )
  if (maxMatch) {
    return {
      ruleType: 'Maximum',
      max: maxMatch[1],
      unit: extractUnit((maxMatch[2] ?? '') + (maxMatch[3] ?? '')),
      sourceText,
    }
  }

  const single = s.match(new RegExp(`^(${NUM.source})\\s*(.*)$`, 'i'))
  if (single) {
    const unit = extractUnit(single[2])
    if (single[2].trim() && !single[2].match(/^[A-Za-z%\/\d\s]+$/)) {
      return { ruleType: 'ExactText', expectedValue: s, sourceText }
    }
    return { ruleType: 'ExactNumber', expectedValue: single[1], unit, sourceText }
  }

  return { ruleType: 'ExactText', expectedValue: s, sourceText }
}

export function unitFromHeader(header: string): string {
  if (/%/.test(header)) return '%'
  if (/N\s*\/\s*mm2|N\/mm2/i.test(header)) return 'N/mm2'
  if (/MPa/i.test(header)) return 'MPa'
  if (/BHN/i.test(header)) return 'BHN'
  return ''
}

export function nameFromHeader(header: string): string {
  return header
    .replace(/\([^)]*\)/g, '')
    .replace(/N\s*\/\s*mm2|MPa|BHN|%|mm2|kgf|mm/gi, '')
    .replace(/[0-9.]+\s*-?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+$/g, '')
}

export function normalizeParameterName(name: string): string {
  return name
    .toLowerCase()
    .replace(/%|mm2|bhn|mpa|kgf|n\/mm2|\/|\\|\(|\)|-|\.|_|\s+/g, '')
    .trim()
}
