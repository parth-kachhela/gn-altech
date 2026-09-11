import type { MasterParameter, MasterSection, ProductMaster } from '@/types'
import { createId, nowIso } from '@/lib/id'
import type { RuleType } from '@/types'

export function createParameter(
  name: string,
  opts: Partial<Omit<MasterParameter, 'id' | 'name' | 'order'>> & { order?: number } = {},
): MasterParameter {
  return {
    id: createId(),
    name,
    aliases: opts.aliases ?? [],
    ruleType: opts.ruleType ?? 'Informational',
    min: opts.min,
    max: opts.max,
    expectedValue: opts.expectedValue,
    unit: opts.unit,
    sourceText: opts.sourceText,
    required: opts.required ?? true,
    order: opts.order ?? 0,
  }
}

export function createSection(
  name: string,
  key: string,
  opts: Partial<Omit<MasterSection, 'id' | 'name' | 'key' | 'order'>> & { order?: number } = {},
): MasterSection {
  return {
    id: createId(),
    name,
    key,
    required: opts.required ?? true,
    order: opts.order ?? 0,
    fileTypeHint: opts.fileTypeHint,
    parameters: opts.parameters ?? [],
  }
}

export function createEmptyMaster(): ProductMaster {
  const now = nowIso()
  const sections: MasterSection[] = [
    createSection('Chemical Analysis', 'CHEMICAL', { required: true, fileTypeHint: 'PDF', order: 0 }),
    createSection('Hardness', 'HARDNESS', { required: true, fileTypeHint: 'PDF', order: 1 }),
    createSection('Micro Structure', 'MICRO', { required: true, fileTypeHint: 'BMP / PNG / JPG', order: 2 }),
    createSection('Tensile', 'TENSILE', { required: true, fileTypeHint: 'PDF', order: 3 }),
  ]
  return {
    id: createId(),
    sapNo: '',
    partNo: '',
    description: '',
    material: '',
    customer: '',
    grade: '',
    revision: 1,
    status: 'ACTIVE',
    sections,
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateMasterForRevision(source: ProductMaster): ProductMaster {
  const now = nowIso()
  const sections: MasterSection[] = source.sections.map((s) => ({
    ...s,
    id: createId(),
    parameters: s.parameters.map((p) => ({ ...p, id: createId() })),
  }))
  return {
    ...source,
    id: createId(),
    revision: (source.revision ?? 1) + 1,
    sections,
    updatedAt: now,
  }
}

export function sectionLabel(key: string, name: string): string {
  return name || key
}

export type { RuleType }
