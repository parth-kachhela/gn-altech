import type { ParsedReportResult } from '@/types'
import { baseResult, value } from '@/services/parsers/common'

export function parseHardnessReport(text: string): ParsedReportResult {
  const result = baseResult(text)

  const readings: Array<{ sample: string; bhn: string }> = []
  const readingRe = /(\d+-\d+)\s+[\d.]+\s+(\d+)\s+(?:OK|FAIL|NG)/gi
  let m: RegExpExecArray | null
  while ((m = readingRe.exec(text)) !== null) {
    readings.push({ sample: m[1], bhn: m[2] })
  }

  const average = text.match(/Average\s*BHN:\s*([\d.]+)/i)?.[1]

  const hd = value('Hardness', average ?? (readings.length ? String(Math.round(avg(readings))) : undefined), 'BHN', 0.9)
  if (hd) result.parameters.push(hd)

  readings.forEach((r, i) => {
    const v = value(`Reading ${i + 1} (${r.sample})`, r.bhn, 'BHN', 0.9)
    if (v) result.parameters.push(v)
  })

  result.confidence = result.parameters.length > 0 ? 0.88 : 0.3
  if (result.parameters.length === 0) {
    result.warnings.push('No BHN readings found in text.')
  }
  return result
}

function avg(list: Array<{ bhn: string }>): number {
  const sum = list.reduce((acc, r) => acc + Number(r.bhn), 0)
  return list.length ? sum / list.length : 0
}
