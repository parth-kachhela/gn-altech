import type { AppRole } from '@/types'

export type Role = AppRole

export const ROLES: Role[] = ['SUPER_ADMIN', 'QA_ADMIN', 'DEPARTMENT_UPLOADER']

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  QA_ADMIN: 'QA / Admin',
  DEPARTMENT_UPLOADER: 'Department Uploader',
}

export interface Capabilities {
  viewDashboard: boolean
  viewCertificates: boolean
  manageProductMaster: boolean
  manageHeatRecords: boolean
  createCertificate: boolean
  uploadReports: boolean
  requestDepartment: boolean
  viewDepartmentRequests: boolean
  reviewCertificate: boolean
  issueCertificate: boolean
  deleteCertificate: boolean
  accessSettings: boolean
  manageUsers: boolean
}

export type Capability = keyof Capabilities

const ALL_CAPS: Capabilities = {
  viewDashboard: true,
  viewCertificates: true,
  manageProductMaster: true,
  manageHeatRecords: true,
  createCertificate: true,
  uploadReports: true,
  requestDepartment: true,
  viewDepartmentRequests: true,
  reviewCertificate: true,
  issueCertificate: true,
  deleteCertificate: true,
  accessSettings: true,
  manageUsers: true,
}

export const ROLE_CAPABILITIES: Record<Role, Capabilities> = {
  SUPER_ADMIN: ALL_CAPS,
  QA_ADMIN: {
    ...ALL_CAPS,
    accessSettings: false,
    manageUsers: false,
  },
  DEPARTMENT_UPLOADER: {
    viewDashboard: true,
    viewCertificates: true,
    manageProductMaster: false,
    manageHeatRecords: false,
    createCertificate: false,
    uploadReports: true,
    requestDepartment: false,
    viewDepartmentRequests: true,
    reviewCertificate: false,
    issueCertificate: false,
    deleteCertificate: false,
    accessSettings: false,
    manageUsers: false,
  },
}

export function getCapabilities(role?: Role): Capabilities {
  return ROLE_CAPABILITIES[role ?? 'DEPARTMENT_UPLOADER'] ?? ROLE_CAPABILITIES.DEPARTMENT_UPLOADER
}

export const DEPARTMENTS = [
  { id: 'CHEMICAL', label: 'Chemical Lab', reportTypes: ['CHEMICAL'] },
  { id: 'HARDNESS', label: 'Hardness Lab', reportTypes: ['HARDNESS', 'MECHANICAL'] },
  { id: 'MICRO', label: 'Micro Lab', reportTypes: ['MICRO'] },
  { id: 'TENSILE', label: 'Tensile Lab', reportTypes: ['TENSILE'] },
] as const

export function normalizeSectionKey(sectionKey: string): string {
  if (sectionKey === 'MECHANICAL') return 'HARDNESS'
  return sectionKey
}

export function departmentForSectionKey(sectionKey: string): string {
  const key = normalizeSectionKey(sectionKey)
  const found = DEPARTMENTS.find((d) =>
    (d.reportTypes as readonly string[]).includes(key),
  )
  return found?.label ?? 'General'
}

// ---- Multi-department workflow helpers (additive) ----
export const WORKFLOW_DEPTS = [
  { key: 'CHEMICAL', label: 'Chemical Lab', home: '/chemical' },
  { key: 'MICRO', label: 'Micro Lab', home: '/micro' },
  { key: 'TENSILE', label: 'Tensile Lab', home: '/tensile' },
  { key: 'HARDNESS', label: 'Hardness Lab', home: '/hardness' },
] as const

export type WorkflowDeptKey = (typeof WORKFLOW_DEPTS)[number]['key']

export function deptHome(department?: string): string {
  const found = WORKFLOW_DEPTS.find((d) => d.label === department)
  return found?.home ?? '/dashboard'
}

export function sectionKeyForDeptLabel(department?: string): string {
  const found = DEPARTMENTS.find((d) => d.label === department)
  return found?.reportTypes[0] ?? ''
}
