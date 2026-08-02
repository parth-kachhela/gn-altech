import { ErrorBoundary } from '@/components/ErrorBoundary'
import { AppLayout } from '@/components/layout/AppLayout'
import { useAuthStore } from '@/stores/authStore'
import { useSeedDemo } from '@/hooks/useSeedDemo'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientFormPage } from '@/pages/ClientFormPage'
import { ItemsPage } from '@/pages/ItemsPage'
import { ItemFormPage } from '@/pages/ItemFormPage'
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

function ProtectedLayout() {
  const user = useAuthStore((s) => s.user)
  useSeedDemo()
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

            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/new" element={<ClientFormPage />} />
            <Route path="clients/:id/edit" element={<ClientFormPage />} />

            <Route path="items" element={<ItemsPage />} />
            <Route path="items/new" element={<ItemFormPage />} />
            <Route path="items/:id/edit" element={<ItemFormPage />} />

            <Route path="heat-records" element={<HeatRecordsPage />} />
            <Route path="heat-records/new" element={<HeatRecordNewPage />} />
            <Route path="heat-records/:id" element={<HeatRecordDetailPage />} />
            <Route path="heat-records/:id/edit" element={<HeatRecordEditPage />} />

            <Route path="certificates" element={<CertificatesPage />} />
            <Route path="certificates/new" element={<CertificateWizardPage />} />
            <Route path="certificates/:id" element={<CertificateDetailPage />} />
            <Route path="certificates/:id/edit" element={<CertificateWizardPage />} />

            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </ErrorBoundary>
  )
}

export default App
