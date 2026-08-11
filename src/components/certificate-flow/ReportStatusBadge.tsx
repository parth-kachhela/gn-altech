import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReportStatus, SourceType, ParameterResult, CertificateStatus } from '@/types'

const CERT_STYLES: Record<CertificateStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  REPORTS_PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  WAITING_FOR_DEPARTMENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  READY_FOR_REVIEW: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  REVIEWED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  ISSUED: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
}

const CERT_LABELS: Record<CertificateStatus, string> = {
  DRAFT: 'Draft',
  REPORTS_PENDING: 'Reports Pending',
  WAITING_FOR_DEPARTMENT: 'Waiting for Department',
  READY_FOR_REVIEW: 'Ready for Review',
  REVIEWED: 'Reviewed',
  ISSUED: 'Issued',
}

const STATUS_STYLES: Record<ReportStatus, string> = {
  NOT_STARTED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  REQUESTED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  UPLOADED: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
  PARSING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  NEEDS_REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  COMPLETE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  FAILED_SPEC: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  OPTIONAL: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  NOT_STARTED: 'Not Started',
  REQUESTED: 'Requested',
  UPLOADED: 'Uploaded',
  PARSING: 'Parsing',
  NEEDS_REVIEW: 'Needs Review',
  COMPLETE: 'Complete',
  WARNING: 'Warning',
  FAILED_SPEC: 'Failed Spec',
  OPTIONAL: 'Optional',
}

const SOURCE_LABELS: Record<SourceType, string> = {
  UPLOADED: 'Uploaded',
  REPEATED: 'Repeated',
  SUGGESTED: 'Near Around',
  MANUAL: 'Manual',
  DEPARTMENT: 'Department',
  DEMO: 'Demo',
}

const RESULT_STYLES: Record<ParameterResult, string> = {
  PASS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  FAIL: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
  NOT_VALIDATED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  TEXT_MATCH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  PENDING: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
}

export function ReportStatusBadge({ value }: { value: ReportStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', STATUS_STYLES[value])}>
      {REPORT_STATUS_LABELS[value]}
    </Badge>
  )
}

export function SourceBadge({ value }: { value: SourceType }) {
  return (
    <Badge variant="secondary" className="font-normal">
      {SOURCE_LABELS[value]}
    </Badge>
  )
}

export function ParameterResultBadge({ value }: { value: ParameterResult }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', RESULT_STYLES[value])}>
      {value.replace('_', ' ')}
    </Badge>
  )
}

export function CertificateStatusBadge({ value }: { value: CertificateStatus }) {
  return (
    <Badge variant="outline" className={cn('border-transparent', CERT_STYLES[value])}>
      {CERT_LABELS[value]}
    </Badge>
  )
}
