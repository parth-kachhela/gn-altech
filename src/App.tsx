import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductMastersPage } from '@/pages/ProductMastersPage'
import { ProductMasterDetailPage } from '@/pages/ProductMasterDetailPage'
import { MasterImportPage } from '@/pages/MasterImportPage'
import { DepartmentRequestsPage } from '@/pages/DepartmentRequestsPage'
import { DepartmentInboxPage } from '@/pages/DepartmentInboxPage'
import { HeatRecordsPage } from '@/pages/HeatRecordsPage'
import { HeatRecordNewPage } from '@/pages/HeatRecordNewPage'
import { HeatRecordDetailPage } from '@/pages/HeatRecordDetailPage'
import { HeatRecordEditPage } from '@/pages/HeatRecordEditPage'
import { CertificatesPage } from '@/pages/CertificatesPage'
import { CertificateWizardPage } from '@/pages/CertificateWizardPage'
import { CertificateDetailPage } from '@/pages/CertificateDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { RequireCapability } from '@/components/RoleGuard'

function ProtectedLayout() {
  const user = useAuthStore((s) => s.user)
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <AppLayout />
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedLayout />}>
          <Route element={<Outlet />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />

            <Route path="product-masters" element={<RequireCapability capability="manageProductMaster"><ProductMastersPage /></RequireCapability>} />
            <Route path="product-masters/import" element={<RequireCapability capability="manageProductMaster"><MasterImportPage /></RequireCapability>} />
            <Route path="product-masters/:id" element={<RequireCapability capability="manageProductMaster"><ProductMasterDetailPage /></RequireCapability>} />
            <Route path="product-masters/:id/edit" element={<RequireCapability capability="manageProductMaster"><ProductMasterDetailPage /></RequireCapability>} />

            <Route path="heat-records" element={<RequireCapability capability="manageHeatRecords"><HeatRecordsPage /></RequireCapability>} />
            <Route path="heat-records/new" element={<RequireCapability capability="manageHeatRecords"><HeatRecordNewPage /></RequireCapability>} />
            <Route path="heat-records/:id" element={<RequireCapability capability="manageHeatRecords"><HeatRecordDetailPage /></RequireCapability>} />
            <Route path="heat-records/:id/edit" element={<RequireCapability capability="manageHeatRecords"><HeatRecordEditPage /></RequireCapability>} />

            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="certificates/new" element={<RequireCapability capability="createCertificate"><CertificateWizardPage /></RequireCapability>} />
            <Route path="certificates/:id" element={<CertificateDetailPage />} />
            <Route path="certificates/:id/edit" element={<RequireCapability capability="createCertificate"><CertificateWizardPage /></RequireCapability>} />

            <Route path="departments" element={<RequireCapability capability="viewDepartmentRequests"><DepartmentRequestsPage /></RequireCapability>} />
            <Route path="departments/inbox" element={<RequireCapability capability="uploadReports"><DepartmentInboxPage /></RequireCapability>} />

            <Route path="settings" element={<RequireCapability capability="accessSettings"><SettingsPage /></RequireCapability>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
