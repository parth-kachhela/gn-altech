import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { Compass } from 'lucide-react'

export function NotFoundPage() {
  return (
    <div>
      <EmptyState
        icon={<Compass className="h-8 w-8" />}
        title="Page not found"
        description="The page you are looking for does not exist or has been moved."
        action={
          <Button asChild>
            <Link to="/dashboard">Go to Dashboard</Link>
          </Button>
        }
      />
    </div>
  )
}
