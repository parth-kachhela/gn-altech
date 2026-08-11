import React from 'react'
import { Document, Page, Text, View } from '@react-pdf/renderer'
import type { Certificate, CertificateHeatSelection, HeatSample, MasterSection, ParsedValue } from '@/types'
import { sampleContexts, reportFor } from '@/lib/certificateStatus'
import { validateValue } from '@/lib/validation'
import { matchParameter } from '@/lib/validation'
import { formatDateDisplay } from '@/lib/id'
import { useHeatRecordStore } from '@/stores/heatRecordStore'

const CELL_BORDER = {
  borderWidth: 0.7,
  borderStyle: 'solid',
  borderColor: '#000',
} as const

const bodyStyle = { fontFamily: 'Helvetica', fontSize: 8 } as const

function Cell({
  children,
  style,
  bold,
  center,
}: {
  children?: React.ReactNode
  style?: Record<string, unknown>
  bold?: boolean
  center?: boolean
}) {
  return (
    <View
      style={{
        ...CELL_BORDER,
        paddingHorizontal: 4,
        paddingVertical: 2,
        ...style,
      }}
    >
      <Text
        style={{
          fontFamily: 'Helvetica',
          fontSize: 8,
          fontWeight: bold ? 'bold' : 'normal',
          textAlign: center ? 'center' : 'left',
        }}
      >
        {children ?? ''}
      </Text>
    </View>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ ...CELL_BORDER, paddingVertical: 3, backgroundColor: '#e5e5e5' }}>
      <Text
        style={{
          fontFamily: 'Helvetica',
          fontSize: 8.5,
          fontWeight: 'bold',
          textAlign: 'center',
        }}
      >
        {children}
      </Text>
    </View>
  )
}

function InfoRow({
  cells,
}: {
  cells: Array<{ label: string; value: string }>
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {cells.map((c, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              ...CELL_BORDER,
              width: 130,
              paddingVertical: 2,
              paddingHorizontal: 4,
              backgroundColor: '#f2f2f2',
            }}
          >
            <Text style={{ ...bodyStyle, fontWeight: 'bold' }}>{c.label}</Text>
          </View>
          <View style={{ ...CELL_BORDER, flex: 1, paddingVertical: 2, paddingHorizontal: 4 }}>
            <Text style={bodyStyle}>{c.value || ' '}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  )
}

function specFor(p: { ruleType: string; min?: string; max?: string; expectedValue?: string; sourceText?: string }): string {
  if (p.sourceText) return p.sourceText
  switch (p.ruleType) {
    case 'Range':
      return `${p.min ?? '?'} - ${p.max ?? '?'}`
    case 'Minimum':
      return `${p.min ?? '?'} Min.`
    case 'Maximum':
      return `${p.max ?? '?'} Max.`
    case 'ExactNumber':
    case 'ExactText':
      return p.expectedValue ?? '—'
    default:
      return 'Info'
  }
}

function valueFor(parsed: ParsedValue[] | undefined, paramName: string): string {
  if (!parsed) return '--'
  const found = parsed.find((v) => matchParameter({ name: paramName, aliases: [] }, v.name))
  return found?.value ?? '--'
}

function SectionGrid({
  title,
  section,
  report,
  heatLabel,
}: {
  title: string
  section: MasterSection
  report?: ReturnType<typeof reportFor>
  heatLabel: string
}) {
  const params = section.parameters
  const parsed = report?.parsedValues ?? []
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View style={{ flexDirection: 'row' }}>
        <Cell bold center style={{ width: 110, backgroundColor: '#f2f2f2' }}>
          Parameter
        </Cell>
        <Cell bold center style={{ width: 130, backgroundColor: '#f2f2f2' }}>
          Master Specification
        </Cell>
        <Cell bold center style={{ width: 90, backgroundColor: '#f2f2f2' }}>
          Observed ({heatLabel})
        </Cell>
        <Cell bold center style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
          Result
        </Cell>
      </View>
      {params.length === 0 ? (
        <View style={{ flexDirection: 'row' }}>
          <Cell style={{ width: 110 }}>—</Cell>
          <Cell style={{ width: 130 }}>—</Cell>
          <Cell center style={{ width: 90 }}>--</Cell>
          <Cell style={{ flex: 1 }}>—</Cell>
        </View>
      ) : (
        params.map((p) => {
          const val = valueFor(parsed, p.name)
          const outcome = val !== '--' && val !== '' ? validateValue(p, val) : undefined
          const result = outcome ? outcome.result : 'PENDING'
          const color = result === 'FAIL' ? '#b91c1c' : result === 'WARNING' ? '#a16207' : '#111827'
          return (
            <View style={{ flexDirection: 'row' }} key={p.id}>
              <Cell style={{ width: 110 }}>{p.name}</Cell>
              <Cell style={{ width: 130 }}>{specFor(p)}</Cell>
              <Cell center style={{ width: 90 }}>{val}</Cell>
              <Cell center style={{ flex: 1 }}>
                <Text style={{ ...bodyStyle, color }}>{result.replace('_', ' ')}</Text>
              </Cell>
            </View>
          )
        })
      )}
    </View>
  )
}

function HeatSection({
  selection,
  sample,
  section,
}: {
  selection: CertificateHeatSelection
  sample?: HeatSample
  section: MasterSection
}) {
  const sampleId = sample?.id
  const report = reportFor(selection, section.key, sampleId)
  const heatLabel = sample ? sample.label : selection.heatCode
  const title = `${section.name.toUpperCase()}${sample ? ` - SAMPLE ${sample.label}` : ''}`
  return (
    <View>
      <SectionGrid title={title} section={section} report={report} heatLabel={heatLabel} />
    </View>
  )
}

export function TestCertificateDocument({ certificate }: { certificate: Certificate }) {
  const cert = certificate
  const snap = cert.productSnapshot
  const heatRecords = useHeatRecordStore.getState().heatRecords

  const partsRows = cert.selectedHeats.map((selection) => {
    const heatRecord = heatRecords.find((h) => h.id === selection.heatRecordId)
    const contexts = sampleContexts(selection, heatRecords)
    return {
      selection,
      heatRecord,
      contexts,
    }
  })

  return (
    <Document
      title={cert.certificateNumber}
      author="GN ALTECH PRIVATE LIMITED"
      subject="Test Certificate"
      creator="GN ALTECH Test Certificate Generator"
    >
      <Page
        size={{ width: 841.89, height: 595.28 }}
        style={{ padding: 24, fontFamily: 'Helvetica', fontSize: 8 }}
      >
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 'bold' }}>
              GN ALTECH PRIVATE LIMITED
            </Text>
            <Text style={{ ...bodyStyle }}>Metoda, Rajkot, Gujarat, India</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 15, fontWeight: 'bold', letterSpacing: 1 }}>
              TEST CERTIFICATE
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={bodyStyle}>Format No.: GEN/QC/01</Text>
            <Text style={bodyStyle}>Rev. No. & Date: 01 / {new Date().getFullYear()}</Text>
          </View>
        </View>

        <InfoRow
          cells={[
            { label: 'Certificate No.', value: cert.certificateNumber || ' ' },
            { label: 'Certificate Date:', value: formatDateDisplay(cert.certificateDate) || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'SAP No.', value: snap?.sapNo || ' ' },
            { label: 'Part No.:', value: snap?.partNo || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Description', value: snap?.description || ' ' },
            { label: 'Grade:', value: snap?.grade || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Material', value: snap?.material || ' ' },
            { label: 'Customer:', value: snap?.customer || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Invoice / Challan Number', value: cert.invoiceNumber || ' ' },
            { label: 'Delivery Condition:', value: cert.deliveryCondition || ' ' },
          ]}
        />

        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row' }}>
            <Cell bold center style={{ width: 34, backgroundColor: '#f2f2f2' }}>Sr. No.</Cell>
            <Cell bold center style={{ width: 90, backgroundColor: '#f2f2f2' }}>SAP No.</Cell>
            <Cell bold center style={{ width: 90, backgroundColor: '#f2f2f2' }}>Part No.</Cell>
            <Cell bold center style={{ flex: 1, backgroundColor: '#f2f2f2' }}>Description</Cell>
            <Cell bold center style={{ width: 90, backgroundColor: '#f2f2f2' }}>Heat Code</Cell>
            <Cell bold center style={{ width: 70, backgroundColor: '#f2f2f2' }}>Batch No.</Cell>
          </View>
          {partsRows.map((row, i) => (
            <View style={{ flexDirection: 'row' }} key={row.selection.id}>
              <Cell center style={{ width: 34 }}>{i + 1}</Cell>
              <Cell style={{ width: 90 }}>{snap?.sapNo || ''}</Cell>
              <Cell style={{ width: 90 }}>{snap?.partNo || ''}</Cell>
              <Cell style={{ flex: 1 }}>{snap?.description || ''}</Cell>
              <Cell style={{ width: 90 }}>{row.selection.heatCode}</Cell>
              <Cell style={{ width: 70 }}>{row.selection.batchNo || ''}</Cell>
            </View>
          ))}
        </View>

        {partsRows.map((row) => {
          const sections = snap?.sections ?? []
          return (
            <View key={`${row.selection.id}-sections`} style={{ marginTop: 6 }}>
              {row.contexts.map((ctx) => (
                <View key={`${row.selection.id}-${ctx.sampleId ?? 'only'}`}>
                  {sections.map((section) => (
                    <HeatSection
                      key={section.id}
                      selection={row.selection}
                      sample={ctx.sampleId ? row.heatRecord?.heats.find((s) => s.id === ctx.sampleId) : undefined}
                      section={section}
                    />
                  ))}
                </View>
              ))}
            </View>
          )
        })}

        <View style={{ marginTop: 6, flexDirection: 'row' }}>
          <View style={{ flex: 1 }}>
            <Cell bold center style={{ backgroundColor: '#f2f2f2' }}>Authorization</Cell>
            <View style={{ ...CELL_BORDER, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
              <Text style={{ ...bodyStyle, textAlign: 'center' }}>For GN ALTECH PRIVATE LIMITED</Text>
              <Text style={{ ...bodyStyle, textAlign: 'center', marginTop: 12 }}>Authorized Signatory</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 6, flexDirection: 'row' }}>
          <View style={{ ...CELL_BORDER, width: 70, paddingVertical: 2, paddingHorizontal: 4, backgroundColor: '#f2f2f2' }}>
            <Text style={{ ...bodyStyle, fontWeight: 'bold' }}>Remarks</Text>
          </View>
          <View style={{ ...CELL_BORDER, flex: 1, paddingVertical: 2, paddingHorizontal: 4 }}>
            <Text style={{ ...bodyStyle, lineHeight: 1.4 }}>
              {cert.remarks || 'This is to certify that the above castings are manufactured as per the customer specification and are found to be conforming to the required quality.'}
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 14, flexDirection: 'row' }}>
          {[
            { label: 'Tested by', value: cert.testedBy },
            { label: 'Reviewed by', value: cert.reviewedBy },
            { label: 'Approved by', value: cert.approvedBy },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ ...bodyStyle, marginTop: 14 }}>{s.label}: {s.value || ''}</Text>
              <View style={{ borderBottomWidth: 0.5, borderColor: '#000', width: 110, marginTop: 2 }} />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
