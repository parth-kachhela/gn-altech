import type { ParsedReportResult } from '@/types'
import { baseResult, value } from '@/services/parsers/common'

const ELEMENTS = [
  'C', 'Si', 'Mn', 'P', 'S', 'Cr', 'Mg', 'Cu', 'Sn', 'Mo',
  'Ni', 'Al', 'Co', 'Nb', 'Ti', 'V', 'Pb', 'Sb', 'Se', 'Zn',
  'Zr', 'La', 'As', 'B', 'Bi', 'Ce',
]

export function parseChemicalReport(text: string): ParsedReportResult {
  const result = baseResult(text)
  const tokens = text.split(/\s+/)

  let start = -1
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i + 1] === '%' && ELEMENTS.includes(tokens[i])) {
      start = i
      break
    }
  }

  if (start === -1) {
    result.warnings.push('No chemical element table found in text.')
    return result
  }

  const headers: string[] = []
  let i = start
  while (i + 1 < tokens.length && tokens[i + 1] === '%' && ELEMENTS.includes(tokens[i])) {
    headers.push(tokens[i])
    i += 2
  }

  const valueStart = i
  let parsed = 0
  for (let j = 0; j < headers.length; j++) {
    const raw = tokens[valueStart + j] ?? ''
    const v = value(headers[j], raw === 'N/A' ? undefined : raw, '%', 0.95)
    if (v) {
      v.normalizedName = headers[j].toLowerCase()
      result.parameters.push(v)
      parsed++
    }
  }

  result.confidence = parsed > 0 ? 0.92 : 0.3
  if (parsed === 0) result.warnings.push('Element headers found but no values parsed.')
  return result
}
