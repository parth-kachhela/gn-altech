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
  { id: 'MECHANICAL', label: 'Mechanical Lab', reportTypes: ['MECHANICAL'] },
  { id: 'HARDNESS', label: 'Hardness Lab', reportTypes: ['HARDNESS'] },
  { id: 'MICRO', label: 'Micro Lab', reportTypes: ['MICRO'] },
  { id: 'TENSILE', label: 'Tensile Lab', reportTypes: ['TENSILE'] },
] as const

export function departmentForSectionKey(sectionKey: string): string {
  const found = DEPARTMENTS.find((d) =>
    (d.reportTypes as readonly string[]).includes(sectionKey),
  )
  return found?.label ?? 'General'
}
