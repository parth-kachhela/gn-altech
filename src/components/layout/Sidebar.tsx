import { NavLink } from 'react-router-dom'
import {
  FileText,
  Factory,
  FlaskConical,
  LayoutDashboard,
  Settings,
  Boxes,
  FileClock,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities, type Capability } from '@/lib/permissions'

const NAV_ITEMS: Array<{ to: string; label: string; icon: typeof LayoutDashboard; cap: Capability }> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, cap: 'viewDashboard' },
  { to: '/product-masters', label: 'Product Masters', icon: Boxes, cap: 'manageProductMaster' },
  { to: '/heat-records', label: 'Heat Records', icon: Factory, cap: 'manageHeatRecords' },
  { to: '/certificates', label: 'Certificates', icon: FileText, cap: 'viewCertificates' },
  { to: '/departments', label: 'Departments', icon: ClipboardList, cap: 'viewDepartmentRequests' },
  { to: '/departments/inbox', label: 'Dept. Inbox', icon: FileClock, cap: 'uploadReports' },
  { to: '/settings', label: 'Settings', icon: Settings, cap: 'accessSettings' },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const caps = getCapabilities(user?.role)

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
        {NAV_ITEMS.filter((item) => caps[item.cap]).map((item) => (
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
        <p className="px-1 text-[10px] text-muted-foreground">
          Data stored in your browser · no server
        </p>
      </div>
    </aside>
  )
}
