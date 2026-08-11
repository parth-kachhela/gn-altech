import type { MasterParameter, ParameterResult } from '@/types'
import { isNumeric } from '@/lib/numeric'
import { normalizeParameterName } from '@/lib/specParser'

export interface ValidationOutcome {
  result: ParameterResult
  message?: string
}

export function validateValue(
  parameter: MasterParameter,
  value: string | undefined,
): ValidationOutcome {
  const v = (value ?? '').trim()
  if (!v) return { result: 'PENDING' }

  if (parameter.ruleType === 'Informational') {
    return { result: 'NOT_VALIDATED', message: 'Informational - no validation rule' }
  }

  if (parameter.ruleType === 'ExactText') {
    const expected = (parameter.expectedValue ?? '').trim().toLowerCase()
    const actual = v.toLowerCase()
    if (!expected) return { result: 'NOT_VALIDATED' }
    return actual === expected
      ? { result: 'TEXT_MATCH', message: `Matches "${parameter.expectedValue}"` }
      : { result: 'WARNING', message: `Expected "${parameter.expectedValue}"` }
  }

  if (!isNumeric(v)) {
    return { result: 'NOT_VALIDATED', message: 'Non-numeric value' }
  }
  const num = Number(v)
  const min = parameter.min !== undefined && isNumeric(parameter.min) ? Number(parameter.min) : undefined
  const max = parameter.max !== undefined && isNumeric(parameter.max) ? Number(parameter.max) : undefined

  switch (parameter.ruleType) {
    case 'Range':
      if (min === undefined || max === undefined) return { result: 'NOT_VALIDATED' }
      return num >= min && num <= max ? { result: 'PASS' } : { result: 'FAIL' }
    case 'Minimum':
      if (min === undefined) return { result: 'NOT_VALIDATED' }
      return num >= min ? { result: 'PASS' } : { result: 'FAIL' }
    case 'Maximum':
      if (max === undefined) return { result: 'NOT_VALIDATED' }
      return num <= max ? { result: 'PASS' } : { result: 'FAIL' }
    case 'ExactNumber': {
      const expected = parameter.expectedValue !== undefined ? Number(parameter.expectedValue) : NaN
      if (Number.isNaN(expected)) return { result: 'NOT_VALIDATED' }
      return num === expected ? { result: 'PASS' } : { result: 'FAIL' }
    }
    default:
      return { result: 'NOT_VALIDATED' }
  }
}

export function matchParameter(
  parameter: Pick<MasterParameter, 'name' | 'aliases'>,
  parsedName: string,
): boolean {
  const norm = normalizeParameterName(parsedName)
  if (!norm) return false
  if (normalizeParameterName(parameter.name) === norm) return true
  return parameter.aliases.some((a) => normalizeParameterName(a) === norm)
}
