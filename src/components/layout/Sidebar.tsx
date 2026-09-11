import { NavLink } from 'react-router-dom'
import {
  FileText, Factory, FlaskConical, LayoutDashboard, Settings, Boxes,
  FileClock, ClipboardList, PlusCircle, UploadCloud, ListChecks, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { getCapabilities, type Capability } from '@/lib/permissions'

const SUPER_NAV: Array<{ to: string; label: string; icon: typeof LayoutDashboard; cap: Capability }> = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, cap: 'viewDashboard' },
  { to: '/product-masters', label: 'Product Masters', icon: Boxes, cap: 'manageProductMaster' },
  { to: '/heat-records', label: 'Heats', icon: Factory, cap: 'manageHeatRecords' },
  { to: '/certificates', label: 'Certificates', icon: FileText, cap: 'viewCertificates' },
  { to: '/departments', label: 'Departments', icon: ClipboardList, cap: 'viewDepartmentRequests' },
  { to: '/departments/inbox', label: 'Dept. Inbox', icon: FileClock, cap: 'uploadReports' },
  { to: '/settings', label: 'Settings', icon: Settings, cap: 'accessSettings' },
]

function deptNav(dept?: string): Array<{ to: string; label: string; icon: typeof LayoutDashboard }> {
  if (dept === 'Chemical Lab') {
    return [
      { to: '/chemical', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/chemical/add-heat', label: 'Add Heat', icon: PlusCircle },
      { to: '/chemical/bulk-upload', label: 'Bulk Chemical Upload', icon: UploadCloud },
      { to: '/chemical/review', label: 'Pending Review', icon: ListChecks },
      { to: '/chemical/completed', label: 'Completed Heats', icon: CheckCircle2 },
    ]
  }
  const base = dept === 'Micro Lab' ? '/micro' : dept === 'Tensile Lab' ? '/tensile' : dept === 'Hardness Lab' ? '/hardness' : null
  if (base) {
    return [
      { to: base, label: 'Dashboard', icon: LayoutDashboard },
      { to: `${base}/upload`, label: 'Upload Reports', icon: UploadCloud },
      { to: `${base}/review`, label: 'Review', icon: ListChecks },
      { to: `${base}/completed`, label: 'Completed', icon: CheckCircle2 },
    ]
  }
  return []
}

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const caps = getCapabilities(user?.role)
  const isDept = user?.role === 'DEPARTMENT_UPLOADER' && Boolean(user?.department)
  const items = isDept ? deptNav(user?.department) : SUPER_NAV.filter((i) => caps[i.cap])

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <FlaskConical className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-wide">GN ALTECH</div>
          <div className="text-[10px] text-muted-foreground">{user?.department ?? 'Test Certificate Generator'}</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to.split('/').length === 2}
            className={({ isActive }) => cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground')}>
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
        {isDept ? <p className="px-3 pt-3 text-[10px] text-muted-foreground">Signed in as {user?.name} · {user?.department}</p> : null}
      </nav>
      <div className="border-t p-3">
        <p className="px-1 text-[10px] text-muted-foreground">Multi-user demo · data syncs across tabs</p>
      </div>
    </aside>
  )
}
