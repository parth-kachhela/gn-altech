import type { ParsedReportResult } from '@/types'
import { baseResult, value } from '@/services/parsers/common'

export function parseTensileReport(text: string): ParsedReportResult {
  const result = baseResult(text)

  const num = (re: RegExp) => text.match(re)?.[1]

  const yieldStress = num(/Yield\s*Stress\s*:\s*([\d.]+)/i)
  const uts = num(/Ultimate\s*Tensile\s*Strength\s*:\s*([\d.]+)/i)
  const elong = num(/Elongation\s*:\s*([\d.]+)/i)
  const maxForce = num(/Maximum\s*Force\s*\(Fm\)\s*:\s*([\d.]+)/i)
  const maxDisp = num(/Max\.?\s*Displacement\s*:\s*([\d.]+)/i)

  const push = (v: ReturnType<typeof value>) => {
    if (v) result.parameters.push(v)
  }

  push(value('0.2% Yield Limit', yieldStress, 'N/mm2', 0.95))
  push(value('Ultimate Tensile Strength', uts, 'N/mm2', 0.95))
  push(value('Elongation', elong, '%', 0.95))
  push(value('Maximum Force (Fm)', maxForce, 'N', 0.8))
  push(value('Maximum Displacement', maxDisp, 'mm', 0.8))

  result.confidence = result.parameters.length > 0 ? 0.9 : 0.3
  if (result.parameters.length === 0) {
    result.warnings.push('No tensile values found in text.')
  }
  return result
}
