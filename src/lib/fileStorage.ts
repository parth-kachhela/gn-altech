import { get, set, del } from 'idb-keyval'

const PREFIX = 'gn-report:'

export async function saveReportBlob(key: string, blob: Blob): Promise<void> {
  await set(PREFIX + key, blob)
}

export async function getReportBlob(key: string): Promise<Blob | undefined> {
  return get(PREFIX + key)
}

export async function deleteReportBlob(key: string): Promise<void> {
  await del(PREFIX + key)
}
