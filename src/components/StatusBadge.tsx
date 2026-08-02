import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type {
  CertificateStatus,
  HeatRecordStatus,
  TestResult,
} from '@/types'

const RESULT_STYLES: Record<TestResult, string> = {
  PASS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  FAIL: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  CONDITIONAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const HEAT_STYLES: Record<HeatRecordStatus, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  USED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

const CERT_STYLES: Record<CertificateStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  REPORTS_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  READY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  ISSUED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
}

export function ResultBadge({ value }: { value: TestResult }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', RESULT_STYLES[value])}>
      {value}
    </Badge>
  )
}

export function HeatRecordStatusBadge({ value }: { value: HeatRecordStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', HEAT_STYLES[value])}>
      {value}
    </Badge>
  )
}

export function CertificateStatusBadge({ value }: { value: CertificateStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', CERT_STYLES[value])}>
      {value.replace('_', ' ')}
    </Badge>
  )
}
