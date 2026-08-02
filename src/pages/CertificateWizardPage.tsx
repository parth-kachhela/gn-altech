import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/PageHeader'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useClientStore } from '@/stores/clientStore'
import { useHeatRecordStore } from '@/stores/heatRecordStore'
import { useCertificateStore } from '@/stores/certificateStore'
import { useStoresHydrated } from '@/hooks/useHydrated'
import { createCertificate, suggestCertificateNumber } from '@/lib/factories'
import type { Certificate } from '@/types'
import { downloadCertificatePdf } from '@/services/certificatePdf'
import { exportCertificateToExcel } from '@/services/excelExport'
import { NotFoundState } from '@/components/EmptyState'
import {
  InputField,
  SelectField,
  SectionCard,
  StepNav,
} from '@/components/certificate-wizard/WizardFields'
import { ItemsStep } from '@/components/certificate-wizard/ItemsStep'
import { FooterStep } from '@/components/certificate-wizard/FooterStep'
import { UploadStep } from '@/components/certificate-wizard/UploadStep'
import { ReviewStep } from '@/components/certificate-wizard/ReviewStep'

type WizardStep = 'info' | 'items' | 'footer' | 'upload' | 'review'
type DraftSetter = (updater: (d: Certificate) => Certificate) => void

export function CertificateWizardPage() {
  const navigate = useNavigate()
  const { id: editId } = useParams()
  const isEdit = Boolean(editId)
  const hydrated = useStoresHydrated()
  const searchHeatRecords = useHeatRecordStore((s) => s.searchHeatRecords)
  const addCertificate = useCertificateStore((s) => s.addCertificate)
  const upsertCertificate = useCertificateStore((s) => s.upsertCertificate)
  const certificates = useCertificateStore((s) => s.certificates)

  const [activeStep, setActiveStep] = useState<WizardStep>('info')
  const [draft, setDraft] = useState<Certificate | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setDraft(null)
    setActiveStep('info')
    setLoadError(false)
  }, [editId])

  useEffect(() => {
    if (!hydrated || draft) return
    if (editId) {
      const existing = useCertificateStore.getState().getCertificate(editId)
      if (existing) {
        setDraft(existing)
        setActiveStep('review')
        setLoadError(false)
      } else {
        setLoadError(true)
      }
      return
    }
    const now = new Date().toISOString().slice(0, 10)
    setDraft(
      createCertificate({
        certificateNumber: suggestCertificateNumber(certificates),
        certificateDate: now,
      }),
    )
  }, [hydrated, certificates, draft, editId, addCertificate])

  const updateDraft = (updater: (d: Certificate) => Certificate) => {
    setDraft((d) => (d ? updater(d) : d))
  }

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <PageHeader title="New Certificate (Wizard)" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-6 w-3/4 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (isEdit && loadError) {
    return (
      <NotFoundState
        backTo="/certificates"
        backLabel="Back to Certificates"
        title="Certificate Not Found"
      />
    )
  }

  if (!draft) return null

  const certificate = draft
  const steps: Array<{ key: WizardStep; label: string }> = [
    { key: 'info', label: 'Certificate Info' },
    { key: 'items', label: 'Items & Heat Codes' },
    { key: 'footer', label: 'Footer & Authorization' },
    { key: 'upload', label: 'Upload Reports' },
    { key: 'review', label: 'Review & Generate' },
  ]

  const saveAndGo = () => {
    upsertCertificate(certificate)
    toast.success(isEdit ? 'Certificate updated' : 'Certificate saved')
    navigate(`/certificates/${certificate.id}`)
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Certificate' : 'New Certificate'}
        description={`Step ${steps.findIndex((s) => s.key === activeStep) + 1} of ${steps.length}: ${steps.find((s) => s.key === activeStep)?.label}`}
        actions={
          <Button variant="ghost" asChild>
            <Link to="/certificates">
              <ArrowLeft className="h-4 w-4" />
              Back to Certificates
            </Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <ol className="flex items-center justify-between">
            {steps.map((step) => {
              const active = step.key === activeStep
              const isComplete =
                steps.findIndex((s) => s.key === activeStep) > steps.findIndex((s) => s.key === step.key)
              return (
                <li key={step.key} className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => setActiveStep(step.key)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : isComplete
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                    title={`Go to ${step.label}`}
                  >
                    {steps.findIndex((s) => s.key === step.key) + 1}
                  </button>
                  <span className="mt-1 text-xs text-muted-foreground">{step.label}</span>
                  {step.key !== steps[steps.length - 1].key && (
                    <div className="mt-4 h-0.5 w-16 -translate-y-4 bg-muted" />
                  )}
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      <Tabs value={activeStep} onValueChange={(v) => setActiveStep(v as WizardStep)} className="w-full">
        <TabsList className="hidden">
          {steps.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="info">
          <InfoStep
            certificate={certificate}
            setDraft={updateDraft}
            onBack={() => navigate('/certificates')}
            onNext={() => setActiveStep('items')}
          />
        </TabsContent>

        <TabsContent value="items">
          <ItemsStep
            certificate={certificate}
            setDraft={updateDraft}
            searchHeatRecords={searchHeatRecords}
            onBack={() => setActiveStep('info')}
            onNext={() => setActiveStep('footer')}
          />
        </TabsContent>

        <TabsContent value="footer">
          <FooterStep
            certificate={certificate}
            setDraft={updateDraft}
            onBack={() => setActiveStep('items')}
            onNext={() => setActiveStep('upload')}
          />
        </TabsContent>

        <TabsContent value="upload">
          <UploadStep
            certificate={certificate}
            setDraft={updateDraft}
            onBack={() => setActiveStep('footer')}
            onNext={() => setActiveStep('review')}
          />
        </TabsContent>

        <TabsContent value="review">
          <ReviewStep
            certificate={certificate}
            setDraft={updateDraft}
            onBack={() => setActiveStep('upload')}
            onSave={saveAndGo}
            onDownloadPdf={async () => {
              upsertCertificate(certificate)
              await downloadCertificatePdf(certificate)
            }}
            onDownloadExcel={() => {
              exportCertificateToExcel(certificate)
              toast.success('Excel exported')
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface InfoStepProps {
  certificate: Certificate
  setDraft: DraftSetter
  onBack: () => void
  onNext: () => void
}

function InfoStep({ certificate, setDraft, onBack, onNext }: InfoStepProps) {
  const canNext = Boolean(
    certificate.clientId && certificate.certificateNumber && certificate.certificateDate,
  )
  return (
    <div className="space-y-4">
      <SectionCard title="Certificate Information">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Certificate Number"
            value={certificate.certificateNumber}
            required
            onChange={(v) => setDraft((d) => ({ ...d, certificateNumber: v }))}
          />
          <InputField
            label="Certificate Date"
            type="date"
            value={certificate.certificateDate}
            required
            onChange={(v) => setDraft((d) => ({ ...d, certificateDate: v }))}
          />
        </div>
        <SelectField
          label="Client"
          value={certificate.clientId}
          required
          items={useClientStore.getState().getClients().map((c) => ({
            value: c.id,
            label: `${c.name}${c.location ? ` (${c.location})` : ''}`,
          }))}
          onChange={(v) => setDraft((d) => ({ ...d, clientId: v }))}
          placeholder="Select client"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Invoice Number"
            value={certificate.invoiceNumber ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, invoiceNumber: v }))}
          />
          <InputField
            label="Invoice Date"
            type="date"
            value={certificate.invoiceDate ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, invoiceDate: v }))}
          />
        </div>
        <InputField
          label="Delivery Condition"
          value={certificate.deliveryCondition ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, deliveryCondition: v }))}
          placeholder="e.g. As Cast"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Material"
            value={certificate.material ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, material: v }))}
          />
          <InputField
            label="Grade"
            value={certificate.grade ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, grade: v }))}
          />
        </div>
      </SectionCard>
      <StepNav
        onNext={onNext}
        onBack={onBack}
        nextLabel="Next: Items & Heat Codes"
        canNext={canNext}
        backLabel="Cancel"
      />
    </div>
  )
}
