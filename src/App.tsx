import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/authStore'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductMastersPage } from '@/pages/ProductMastersPage'
import { ProductMasterDetailPage } from '@/pages/ProductMasterDetailPage'
import { MasterImportPage } from '@/pages/MasterImportPage'
import { DepartmentRequestsPage } from '@/pages/DepartmentRequestsPage'
import { HeatRecordsPage } from '@/pages/HeatRecordsPage'
import { HeatRecordNewPage } from '@/pages/HeatRecordNewPage'
import { HeatRecordDetailPage } from '@/pages/HeatRecordDetailPage'
import { HeatRecordEditPage } from '@/pages/HeatRecordEditPage'
import { CertificatesPage } from '@/pages/CertificatesPage'
import { CertificateWizardPage } from '@/pages/CertificateWizardPage'
import { CertificateDetailPage } from '@/pages/CertificateDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ChemicalDashboardPage } from '@/pages/chemical/ChemicalDashboardPage'
import { ChemicalAddHeatPage } from '@/pages/chemical/ChemicalAddHeatPage'
import { ChemicalBulkUploadPage } from '@/pages/chemical/ChemicalBulkUploadPage'
import { ChemicalReviewPage } from '@/pages/chemical/ChemicalReviewPage'
import { DeptDashboardPage, DeptUploadPage, DeptCompletedPage } from '@/pages/dept/DeptPages'
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

            <Route path="heat-records" element={<HeatRecordsPage />} />
            <Route path="heat-records/new" element={<RequireCapability capability="manageHeatRecords"><HeatRecordNewPage /></RequireCapability>} />
            <Route path="heat-records/:id" element={<HeatRecordDetailPage />} />
            <Route path="heat-records/:id/edit" element={<RequireCapability capability="manageHeatRecords"><HeatRecordEditPage /></RequireCapability>} />

            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="certificates/new" element={<RequireCapability capability="createCertificate"><CertificateWizardPage /></RequireCapability>} />
            <Route path="certificates/:id" element={<CertificateDetailPage />} />
            <Route path="certificates/:id/edit" element={<RequireCapability capability="createCertificate"><CertificateWizardPage /></RequireCapability>} />

            <Route path="departments" element={<RequireCapability capability="viewDepartmentRequests"><DepartmentRequestsPage /></RequireCapability>} />
            <Route path="departments/inbox" element={<Navigate to="/departments" replace />} />

            <Route path="chemical" element={<ChemicalDashboardPage />} />
            <Route path="chemical/add-heat" element={<ChemicalAddHeatPage />} />
            <Route path="chemical/bulk-upload" element={<ChemicalBulkUploadPage />} />
            <Route path="chemical/review" element={<ChemicalReviewPage mode="review" />} />
            <Route path="chemical/completed" element={<ChemicalReviewPage mode="completed" />} />

            <Route path="micro" element={<DeptDashboardPage dept="micro" />} />
            <Route path="micro/upload" element={<DeptUploadPage dept="micro" />} />
            <Route path="micro/review" element={<DeptUploadPage dept="micro" />} />
            <Route path="micro/completed" element={<DeptCompletedPage dept="micro" />} />

            <Route path="tensile" element={<DeptDashboardPage dept="tensile" />} />
            <Route path="tensile/upload" element={<DeptUploadPage dept="tensile" />} />
            <Route path="tensile/review" element={<DeptUploadPage dept="tensile" />} />
            <Route path="tensile/completed" element={<DeptCompletedPage dept="tensile" />} />

            <Route path="hardness" element={<DeptDashboardPage dept="hardness" />} />
            <Route path="hardness/upload" element={<DeptUploadPage dept="hardness" />} />
            <Route path="hardness/review" element={<DeptUploadPage dept="hardness" />} />
            <Route path="hardness/completed" element={<DeptCompletedPage dept="hardness" />} />

            <Route path="settings" element={<RequireCapability capability="accessSettings"><SettingsPage /></RequireCapability>} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
