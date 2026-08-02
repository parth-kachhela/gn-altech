import React from 'react'
import { Document, Image, Page, Text, View } from '@react-pdf/renderer'
import type { Certificate, TestParameterRow } from '@/types'
import {
  combineObserved,
  combineSpecified,
  formatSpecified,
} from '@/lib/result'
import { formatDateDisplay } from '@/lib/id'
import { getCertificateDisplayParts } from '@/lib/factories'
import { useClientStore } from '@/stores/clientStore'
import { useSettingsStore } from '@/stores/settingsStore'

interface CertColumn {
  header: string
  specified: string
  observed: string
}

const CELL_BORDER = {
  borderWidth: 0.7,
  borderStyle: 'solid',
  borderColor: '#000',
} as const

const bodyStyle = { fontFamily: 'Helvetica', fontSize: 8 } as const

function shortSymbol(label: string): string {
  const m = label.match(/\(([^)]+)\)/)
  return m ? m[1] : label
}

function buildColumns(
  rows: TestParameterRow[],
  config?: Array<{ header: string; labels: string[] }>,
): CertColumn[] {
  const cols: CertColumn[] = []
  const used = new Set<TestParameterRow>()
  if (config) {
    for (const cfg of config) {
      const matching = rows.filter((r) =>
        cfg.labels.some((l) => r.label.toLowerCase() === l.toLowerCase()),
      )
      if (matching.length === 0) continue
      matching.forEach((m) => used.add(m))
      cols.push({
        header: cfg.header,
        specified: combineSpecified(matching),
        observed: combineObserved(matching),
      })
    }
  }
  const leftover = rows.filter((r) => !used.has(r))
  for (const r of leftover) {
    cols.push({
      header: r.label + (r.unit ? ` ${r.unit}` : ''),
      specified: formatSpecified(r.minimum, r.maximum),
      observed: r.observed?.trim() || '--',
    })
  }
  return cols
}

const MECH_COLUMNS = [
  { header: '0.2% Yield Limit N/mm2', labels: ['0.2% Yield Limit'] },
  {
    header: 'Ultimate Tensile Strength N/mm2',
    labels: ['Ultimate Tensile Strength', 'UTS'],
  },
  { header: 'Elongation % / Hardness BHN', labels: ['Elongation', 'Hardness'] },
]

const MICRO_COLUMNS = [
  { header: 'Average Nodularity %', labels: ['Average Nodularity'] },
  { header: 'Nodule Count / mm2', labels: ['Nodule Count'] },
  { header: 'Pearlite / Ferrite', labels: ['Pearlite', 'Ferrite'] },
  { header: 'Carbide', labels: ['Carbide'] },
]

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
    <View
      style={{
        ...CELL_BORDER,
        paddingVertical: 3,
        backgroundColor: '#e5e5e5',
      }}
    >
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

function SpecGrid({
  title,
  columns,
  heatNo,
}: {
  title: string
  columns: CertColumn[]
  heatNo: string
}) {
  const labelWidth = 62
  const heatWidth = 34
  return (
    <View>
      <SectionTitle>{title}</SectionTitle>
      <View style={{ flexDirection: 'row' }}>
        <Cell bold center style={{ width: labelWidth, backgroundColor: '#f2f2f2' }}>
          {title === 'CHEMICAL ANALYSIS' ? 'Elements' : 'Property'}
        </Cell>
        <Cell bold center style={{ width: heatWidth, backgroundColor: '#f2f2f2' }}>
          Heat No.
        </Cell>
        {columns.map((c) => (
          <Cell bold center key={c.header} style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
            {c.header}
          </Cell>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Cell style={{ width: labelWidth, backgroundColor: '#f7f7f7' }}>Specified</Cell>
        <Cell center style={{ width: heatWidth }}>
          --
        </Cell>
        {columns.map((c, i) => (
          <Cell center key={i} style={{ flex: 1 }}>
            {c.specified}
          </Cell>
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        <Cell style={{ width: labelWidth }}>Observed</Cell>
        <Cell center style={{ width: heatWidth }}>
          {heatNo}
        </Cell>
        {columns.map((c, i) => (
          <Cell center key={i} style={{ flex: 1 }}>
            {c.observed}
          </Cell>
        ))}
      </View>
    </View>
  )
}

function InfoRow({
  cells,
}: {
  cells: Array<{ label: string; value: string; fill?: boolean }>
}) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {cells.map((c, i) => (
        <React.Fragment key={i}>
          <View
            style={{
              ...CELL_BORDER,
              width: 118,
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

export function TestCertificateDocument({
  certificate,
}: {
  certificate: Certificate
}) {
  const cert = certificate
  const settings = useSettingsStore.getState()
  const signatureImage = cert.signatureImage || settings.signatureImage
  const stampImage = cert.stampImage || settings.stampImage
  const displayParts = getCertificateDisplayParts(cert)
  const heatNo =
    displayParts[0]?.dailyHeatNumber?.trim() || cert.chemicalRows[0]?.observed || '--'
  const chemicalColumns = buildColumns(
    cert.chemicalRows,
    cert.chemicalRows.map((r) => ({
      header: `${shortSymbol(r.label)}${r.unit ? ` ${r.unit}` : ''}`,
      labels: [r.label],
    })),
  )
  const mechanicalColumns = buildColumns(cert.mechanicalRows, MECH_COLUMNS)
  const microColumns = buildColumns(cert.microStructureRows, MICRO_COLUMNS)

   const remarks = cert.remarks?.trim() || cert.certificationStatement?.trim() || ' '
  const client = useClientStore.getState().getClient(cert.clientId)
  const clientName = client?.name ?? cert.clientId

  return (
    <Document
      title={cert.certificateNumber}
      author={cert.companyName}
      subject="Test Certificate"
      creator="GN ALTECH Test Certificate Generator"
    >
      <Page
        size={{ width: 841.89, height: 595.28 }}
        style={{ padding: 24, fontFamily: 'Helvetica', fontSize: 8 }}
      >
        {/* Company / title / format */}
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 13, fontWeight: 'bold' }}>
              {cert.companyName || 'GN ALTECH PRIVATE LIMITED'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 15,
                fontWeight: 'bold',
                letterSpacing: 1,
              }}
            >
              {cert.title || 'TEST CERTIFICATE'}
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ ...bodyStyle }}>
              Format No.: {cert.formatNumber || ' '}
            </Text>
            <Text style={bodyStyle}>Rev. No. & Date: {cert.revisionText || ' '}</Text>
            {cert.licenseNumber ? (
              <Text style={bodyStyle}>Licence No.: {cert.licenseNumber}</Text>
            ) : null}
            {cert.standardReference ? (
              <Text style={bodyStyle}>Std. Ref.: {cert.standardReference}</Text>
            ) : null}
          </View>
        </View>

        {/* Certificate information */}
        <InfoRow
          cells={[
            { label: 'Certificate No.', value: cert.certificateNumber || ' ' },
            { label: 'Certificate Date:', value: formatDateDisplay(cert.certificateDate) || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Customer', value: clientName || ' ' },
            { label: 'Grade:', value: cert.grade || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Invoice / Challan Number', value: cert.invoiceNumber || ' ' },
            { label: 'Invoice Date:', value: formatDateDisplay(cert.invoiceDate) || ' ' },
          ]}
        />
        <InfoRow
          cells={[
            { label: 'Delivery Condition', value: cert.deliveryCondition || ' ' },
            { label: 'Material:', value: cert.material || ' ' },
          ]}
        />

        {/* Parts table */}
        <View style={{ marginTop: 6 }}>
          <View style={{ flexDirection: 'row' }}>
            <Cell bold center style={{ width: 34, backgroundColor: '#f2f2f2' }}>Sr. No.</Cell>
            <Cell bold center style={{ width: 80, backgroundColor: '#f2f2f2' }}>Qty.</Cell>
            <Cell bold center style={{ width: 80, backgroundColor: '#f2f2f2' }}>Part No.</Cell>
            <Cell bold center style={{ flex: 1, backgroundColor: '#f2f2f2' }}>Description</Cell>
            <Cell bold center style={{ width: 80, backgroundColor: '#f2f2f2' }}>Heat No.</Cell>
            <Cell bold center style={{ width: 80, backgroundColor: '#f2f2f2' }}>Batch No.</Cell>
          </View>
          {displayParts.map((p, i) => (
            <View style={{ flexDirection: 'row' }} key={p.id}>
              <Cell center style={{ width: 34 }}>{i + 1}</Cell>
              <Cell style={{ width: 80 }}>{p.quantity}</Cell>
              <Cell style={{ width: 80 }}>{p.partNumber}</Cell>
              <Cell style={{ flex: 1 }}>{p.description}</Cell>
              <Cell style={{ width: 80 }}>{p.dailyHeatNumber}</Cell>
              <Cell style={{ width: 80 }}>{p.batchNumber}</Cell>
            </View>
          ))}
        </View>

        {/* Test sections */}
        <View style={{ marginTop: 6 }}>
          <SpecGrid
            title="CHEMICAL ANALYSIS"
            columns={chemicalColumns}
            heatNo={heatNo}
          />
          <SpecGrid
            title="MECHANICAL PROPERTIES"
            columns={mechanicalColumns}
            heatNo={heatNo}
          />
          <SpecGrid
            title="MICRO STRUCTURE"
            columns={microColumns}
            heatNo={heatNo}
          />
        </View>

        {/* Additional tests + authorization */}
        <View style={{ marginTop: 6, flexDirection: 'row' }}>
          <View style={{ flex: 3 }}>
            <View style={{ flexDirection: 'row' }}>
              <Cell bold style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
                Additional Test
              </Cell>
              <Cell bold style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
                Result
              </Cell>
            </View>
            {cert.additionalTests.map((t) => (
              <View style={{ flexDirection: 'row' }} key={t.id}>
                <Cell style={{ flex: 1 }}>{t.label}</Cell>
                <Cell style={{ flex: 1 }}>{t.value}</Cell>
              </View>
            ))}
          </View>
          <View style={{ flex: 1.15 }}>
            <Cell bold center style={{ backgroundColor: '#f2f2f2' }}>
              Authorization
            </Cell>
            <View
              style={{
                ...CELL_BORDER,
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
              }}
            >
              <Text style={{ ...bodyStyle, textAlign: 'center' }}>
                {cert.companyAuthorizationText || 'For GN ALTECH PRIVATE LIMITED'}
              </Text>
              <Text style={{ ...bodyStyle, textAlign: 'center', marginTop: 12 }}>
                Authorized Signatory
              </Text>
            </View>
          </View>
        </View>

        {/* Remarks */}
        <View style={{ marginTop: 6, flexDirection: 'row' }}>
          <View
            style={{
              ...CELL_BORDER,
              width: 70,
              paddingVertical: 2,
              paddingHorizontal: 4,
              backgroundColor: '#f2f2f2',
            }}
          >
            <Text style={{ ...bodyStyle, fontWeight: 'bold' }}>Remarks</Text>
          </View>
          <View style={{ ...CELL_BORDER, flex: 1, paddingVertical: 2, paddingHorizontal: 4 }}>
            <Text style={{ ...bodyStyle, lineHeight: 1.4 }}>{remarks}</Text>
          </View>
        </View>

        {/* Signature block */}
        <View style={{ marginTop: 14, flexDirection: 'row' }}>
          {[
            { label: 'Tested by', value: cert.testedBy },
            { label: 'Reviewed by', value: cert.reviewedBy },
            { label: 'Approved by', value: cert.approvedBy },
          ].map((s, index) => (
            <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
              {index === 2 && signatureImage ? (
                <Image
                  src={signatureImage}
                  style={{ width: 60, height: 26, objectFit: 'contain' }}
                />
              ) : index === 1 && stampImage ? (
                <Image
                  src={stampImage}
                  style={{ width: 60, height: 26, objectFit: 'contain' }}
                />
              ) : null}
              <Text style={{ ...bodyStyle, marginTop: 14 }}>
                {s.label}: {s.value || ''}
              </Text>
              <View style={{ borderBottomWidth: 0.5, borderColor: '#000', width: 110, marginTop: 2 }} />
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
