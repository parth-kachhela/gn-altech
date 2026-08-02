import type { Certificate } from '@/types'
import {
  InputField,
  SectionCard,
  StepNav,
  TextAreaField,
} from '@/components/certificate-wizard/WizardFields'

type DraftSetter = (updater: (d: Certificate) => Certificate) => void

interface FooterStepProps {
  certificate: Certificate
  setDraft: DraftSetter
  onBack: () => void
  onNext: () => void
}

export function FooterStep({ certificate, setDraft, onBack, onNext }: FooterStepProps) {
  return (
    <div className="space-y-4">
      <SectionCard title="Remarks & Certification Statement">
        <TextAreaField
          label="Remarks"
          value={certificate.remarks ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, remarks: v }))}
          rows={3}
        />
        <TextAreaField
          label="Certification Statement"
          value={certificate.certificationStatement ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, certificationStatement: v }))}
          rows={3}
        />
        <TextAreaField
          label="Company Authorization Text"
          value={certificate.companyAuthorizationText ?? ''}
          onChange={(v) => setDraft((d) => ({ ...d, companyAuthorizationText: v }))}
          rows={2}
        />
      </SectionCard>

      <SectionCard title="Authorized Signatories">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InputField
            label="Tested By"
            value={certificate.testedBy ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, testedBy: v }))}
          />
          <InputField
            label="Reviewed By"
            value={certificate.reviewedBy ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, reviewedBy: v }))}
          />
          <InputField
            label="Approved By"
            value={certificate.approvedBy ?? ''}
            onChange={(v) => setDraft((d) => ({ ...d, approvedBy: v }))}
          />
        </div>
      </SectionCard>

      <StepNav
        onBack={onBack}
        onNext={onNext}
        nextLabel="Next: Upload Reports"
      />
    </div>
  )
}
