import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { seedLabDemoData } from '@/services/labDemoSeed'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

/** One-click loader for the 16 real lab files (all 4 departments). Idempotent. */
export function LoadLabDemoButton({ variant = 'outline' }: { variant?: 'outline' | 'default' }) {
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  return (
    <Button
      variant={variant}
      disabled={loading}
      onClick={() => {
        setLoading(true)
        toast.info('Loading demo lab files (16 reports)…')
        seedLabDemoData(user?.name ?? 'demo')
          .then((r) => {
            if (r.heats === 0 && r.reports === 0) toast.success('Demo lab files already loaded — nothing new.')
            else toast.success(`Demo loaded: ${r.heats} heat(s), ${r.reports} report(s)${r.skipped ? ` (${r.skipped} already existed)` : ''}`)
          })
          .catch((e) => toast.error(e instanceof Error ? e.message : 'Demo load failed'))
          .finally(() => setLoading(false))
      }}
    >
      {loading ? 'Loading demo…' : 'Load demo lab files'}
    </Button>
  )
}
