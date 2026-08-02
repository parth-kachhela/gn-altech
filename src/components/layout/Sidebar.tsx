import { NavLink, useNavigate } from 'react-router-dom'
import {
  FileText,
  Factory,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useCertificateStore } from '@/stores/certificateStore'
import { toast } from 'sonner'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/items', label: 'Items', icon: Package },
  { to: '/heat-records', label: 'Heat Records', icon: Factory },
  { to: '/certificates', label: 'Certificates', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  const loadA6ADemo = useCertificateStore((s) => s.loadA6ADemo)

  const handleA6A = () => {
    const id = loadA6ADemo()
    toast.success('A6A demo certificate loaded')
    navigate(`/certificates/${id}`)
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide">GN ALTECH</div>
          <div className="text-[10px] text-muted-foreground">Test Certificate Generator</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-3">
        <Button variant="outline" className="w-full justify-start gap-2 text-xs" onClick={handleA6A}>
          <Sparkles className="h-4 w-4 text-amber-500" />
          Load A6A Demo
        </Button>
        <p className="mt-2 px-1 text-[10px] text-muted-foreground">
          Demo mode · data stored in your browser
        </p>
      </div>
    </aside>
  )
}
