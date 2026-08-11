import type { HeatReportData, MasterParameter, ParsedValue, ProductMaster } from '@/types'
import { createId, nowIso } from '@/lib/id'

function formatNumber(n: number): number {
  return Math.round(n * 1000) / 1000
}

function valueFor(parameter: MasterParameter): ParsedValue | undefined {
  const unit = parameter.unit
  switch (parameter.ruleType) {
    case 'Range': {
      const min = Number(parameter.min)
      const max = Number(parameter.max)
      if (Number.isNaN(min) || Number.isNaN(max)) return undefined
      return { name: parameter.name, value: String(formatNumber((min + max) / 2)), unit }
    }
    case 'Minimum': {
      const min = Number(parameter.min)
      if (Number.isNaN(min)) return undefined
      return { name: parameter.name, value: String(formatNumber(min * 1.05)), unit }
    }
    case 'Maximum': {
      const max = Number(parameter.max)
      if (Number.isNaN(max)) return undefined
      return { name: parameter.name, value: String(formatNumber(max * 0.9)), unit }
    }
    case 'ExactNumber':
      return parameter.expectedValue
        ? { name: parameter.name, value: parameter.expectedValue, unit }
        : undefined
    case 'ExactText':
      return parameter.expectedValue
        ? { name: parameter.name, value: parameter.expectedValue, unit }
        : undefined
    case 'Informational':
      return undefined
  }
}

export function buildDemoHeatReports(
  master: ProductMaster,
  sampleId: string | undefined,
  sampleLabel: string | undefined,
): HeatReportData[] {
  const now = nowIso()
  const reports: HeatReportData[] = []
  for (const section of master.sections) {
    if (!section.required) continue
    const values = section.parameters.map(valueFor).filter((v): v is ParsedValue => Boolean(v))
    if (values.length === 0) continue
    reports.push({
      id: createId(),
      sectionKey: section.key,
      sectionName: section.name,
      sampleId,
      sampleLabel,
      parsedValues: values,
      confirmed: true,
      fileMetadata: undefined,
      warnings: [],
      uploadedBy: 'Demo Data',
      uploadedAt: now,
      status: 'COMPLETE',
    })
  }
  return reports
}
