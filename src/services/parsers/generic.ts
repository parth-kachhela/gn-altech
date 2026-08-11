import type { ParsedReportResult } from '@/types'
import { baseResult, value } from '@/services/parsers/common'

export function parseGenericText(text: string): ParsedReportResult {
  const result = baseResult(text)

  const pairRe = /([A-Za-z][A-Za-z0-9 .\-/()%]*(?:\s%\)?)?)\s*:\s*([-+]?\d+(?:\.\d+)?)\s*([A-Za-z/%]+)?/g
  let m: RegExpExecArray | null
  while ((m = pairRe.exec(text)) !== null) {
    const name = m[1].replace(/\s+/g, ' ').trim()
    const v = value(name, m[2], m[3], 0.6)
    if (v) result.parameters.push(v)
  }

  result.confidence = result.parameters.length > 0 ? 0.7 : 0.2
  if (result.parameters.length === 0) {
    result.warnings.push('No "Name: value" pairs found in text.')
  }
  return result
}
