import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/PageHeader'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities, ROLE_LABELS, type Capability } from '@/lib/permissions'

export function RequireCapability({
  capability,
  children,
  fallbackTo,
}: {
  capability: Capability
  children: ReactNode
  fallbackTo?: string
}) {
  const user = useAuthStore((s) => s.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const caps = getCapabilities(user.role)
  if (caps[capability]) return <>{children}</>

  if (fallbackTo) {
    return <Navigate to={fallbackTo} replace />
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Not Authorized" description="You do not have permission to access this area." />
      <div className="flex flex-col items-center gap-3 rounded-md border bg-muted/30 p-10 text-center">
        <ShieldAlert className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">
          Your current role (<strong>{ROLE_LABELS[user.role]}</strong>) does not have permission to
          view this page.
        </p>
        <p className="text-xs text-muted-foreground">
          Requested: {location.pathname}
        </p>
        <Button asChild>
          <Link to="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
