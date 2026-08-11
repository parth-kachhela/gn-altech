const OLD_KEYS = [
  'gn-alt-certificates',
  'gn-alt-heat-records',
  'gn-alt-clients',
  'gn-alt-items',
  'gn-alt-settings',
  'gn-alt-auth',
]

const FLAG_KEY = 'gn-alt-migrated-sap-v1'

export function runSapMigration(): void {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(FLAG_KEY)) return

  const backupKeys: string[] = []
  for (const key of OLD_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    const backupKey = `gn-alt-backup-v2-${key}`
    localStorage.setItem(backupKey, raw)
    localStorage.removeItem(key)
    backupKeys.push(backupKey)
  }

  localStorage.setItem(FLAG_KEY, new Date().toISOString())

  if (backupKeys.length > 0) {
    console.info(
      `[gn-alt] Backed up old demo data to keys: ${backupKeys.join(', ')}`,
    )
  }
}
