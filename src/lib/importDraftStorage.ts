import { get, set, del } from 'idb-keyval'
import type { ImportDraft } from '@/services/masterImport'

export type ImportDecision = 'import' | 'skip' | 'revision'

export interface PersistedImportDraft {
  fileName: string
  draft: ImportDraft
  decisions: Record<string, ImportDecision>
  savedAt: string
}

const KEY = 'gn-import-draft'

export async function saveImportDraft(
  fileName: string,
  draft: ImportDraft,
  decisions: Record<string, ImportDecision>,
): Promise<void> {
  await set(KEY, { fileName, draft, decisions, savedAt: new Date().toISOString() } satisfies PersistedImportDraft)
}

export async function getImportDraft(): Promise<PersistedImportDraft | undefined> {
  return get(KEY)
}

export async function deleteImportDraft(): Promise<void> {
  await del(KEY)
}
