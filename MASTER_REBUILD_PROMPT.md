# MASTER REBUILD PROMPT
## Simplified Test Certificate Generator - React + Vite + TypeScript + Tailwind CSS + shadcn/ui

Build a new, complete, working frontend demo for a manufacturing **Test Certificate Generation System**. The current application is overcomplicated and contains broken certificate routes, disabled PDF upload, unnecessary automatic heat-number generation, and an incorrect certificate layout. Rebuild the application from a clean Vite project and follow this specification exactly.

---

## 1. Mandatory Technology Stack

Use:

- React
- Vite
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui
- React Router DOM
- React Hook Form
- Zod
- Zustand with persistence
- TanStack Table
- Lucide React
- Sonner
- pdfjs-dist for reading text-based PDF reports in the browser
- @react-pdf/renderer for final certificate PDF generation
- idb-keyval or IndexedDB for storing uploaded PDF files when persistence is needed

Do not build a backend. The entire demo must run in the browser, but structure services so a real API can be connected later.

---

## 2. Core Correction: Heat Numbers Are Manual

Do **not** automatically generate heat numbers.
Do **not** create or request a sequence-number field.
Do **not** force users to follow an automatically generated format.

The operator manually enters the heat numbers exactly as provided by the factory.

Examples shown only as helper text:

- Daily Heat No.: `A6A`
  - `A` may represent January
  - `6` may represent year 2026
  - `A` may represent day 1
- Monthly Heat No.: `AY-001`
- Yearly Heat No.: `2026`

These examples must never be auto-filled. The user retains full control and may enter other valid factory formats.

Daily heat number should be validated only for duplicate records. Do not reject a value merely because it does not match the sample format.

---

## 3. Simplified Heat Record Page

The Heat Record page must be minimal and operator-friendly.

Required fields:

- Client Name
- Part Name
- Part Number
- Quantity
- Quantity Unit
- Daily Heat Number
- Monthly Heat Number
- Yearly Heat Number
- Batch Number
- Material
- Grade
- Remarks

Optional fields:

- Invoice / Challan Number
- Invoice Date
- Delivery Condition
- Production Date

Remove these unnecessary fields:

- Sequence Number
- Auto-generate buttons
- Furnace number
- Shift
- Operator name
- Production line
- Complex heat-code configuration

Heat-record table columns:

- Client
- Part Name
- Part No.
- Quantity
- Daily Heat No.
- Monthly Heat No.
- Yearly Heat No.
- Batch No.
- Status
- Actions

Actions:

- View
- Edit
- Use in Certificate
- Duplicate
- Delete

Provide realistic demo data on first launch.

---

## 4. Correct Report Types

The system must use these three report types:

1. Chemical Analysis Report
2. Mechanical Properties Report
3. Micro Structure Report

Do not call the third report "Microbiological Report".

---

## 5. Simplified Certificate Workflow

### Step 1 - Certificate Header and Part Details

Fields:

- Certificate Number
- Certificate Date
- Customer / Client
- Invoice / Challan Number
- Invoice Date
- Delivery Condition
- Material
- Grade
- Format Number
- Revision Number and Date
- Standard / IS Reference
- License Number

Add one or more part rows. Every row contains:

- Serial Number displayed by the table only; it is not a heat-record field
- Quantity
- Part Number
- Description / Part Name
- Daily Heat Number
- Monthly Heat Number
- Yearly Heat Number
- Batch Number

The user may add, remove, reorder, and edit rows.

### Step 2 - Upload Three PDF Reports

Provide exactly three upload cards:

- Chemical Analysis PDF
- Mechanical Properties PDF
- Micro Structure PDF

Each card must support:

- Drag and drop
- Browse file
- PDF only validation
- File name and size
- Upload / parsing progress
- Remove
- Replace
- Retry
- Parsed-data preview
- Parse error message

### Step 3 - Review and Edit Extracted Data

After parsing, display all extracted fields in editable tables.

The user must be able to edit every extracted value, limit, unit, label, result, and note before generating the certificate.

### Step 4 - Certificate Preview and Generation

Generate an A4 landscape certificate that visually follows the supplied GN ALTECH reference:

- Dense black-and-white industrial table layout
- Company name at top left
- TEST CERTIFICATE centered
- Format and revision information at top right
- Certificate header fields
- Part details table
- Chemical Analysis section
- Mechanical Properties section
- Micro Structure section
- Additional Tests section
- Remarks
- Authorized-signatory area

The preview and downloaded PDF must use the same data model.

---

## 6. PDF Upload and Browser Parsing

Use `pdfjs-dist` correctly.

Required implementation:

1. Accept a PDF file with `<input type="file" accept="application/pdf">`.
2. Read the file as `ArrayBuffer`.
3. Load it using `pdfjs-dist`.
4. Extract text from every page.
5. Join text items in reading order.
6. Detect the report type.
7. Parse known labels using robust regular expressions.
8. Store extracted data in Zustand.
9. Show extracted values immediately in an editable review screen.

Configure the PDF.js worker correctly for Vite. The upload feature is considered broken unless a real local PDF can be selected, read, parsed, reviewed, and used to generate a certificate.

For demo persistence:

- Store extracted JSON in localStorage through Zustand.
- Store uploaded file blobs in IndexedDB only when required.
- Do not attempt to store large raw PDF files directly in localStorage.

The supplied demo PDFs contain machine-readable `KEY=VALUE` lines. Implement a generic parser for those lines first, then implement human-label fallback parsing.

### Common keys

- `REPORT_TYPE`
- `CUSTOMER`
- `PART_NAME`
- `PART_NO`
- `QTY`
- `DAILY_HEAT_NO`
- `MONTHLY_HEAT_NO`
- `YEARLY_HEAT_NO`
- `BATCH_NO`
- `OVERALL_RESULT`

### Chemical keys

- `C_PERCENT`
- `SI_PERCENT`
- `MN_PERCENT`
- `P_PERCENT`
- `S_PERCENT`
- `CR_PERCENT`
- `MG_PERCENT`
- `CU_PERCENT`
- `SN_PERCENT`
- `MO_PERCENT`

### Mechanical keys

- `YIELD_STRENGTH`
- `YIELD_UNIT`
- `UTS`
- `UTS_UNIT`
- `ELONGATION`
- `ELONGATION_UNIT`
- `HARDNESS`
- `HARDNESS_UNIT`

### Micro Structure keys

- `AVERAGE_NODULARITY`
- `NODULARITY_UNIT`
- `NODULE_COUNT`
- `NODULE_COUNT_UNIT`
- `PEARLITE`
- `FERRITE`
- `CARBIDE`

The parser must preserve values even when some fields are missing. Missing fields should appear blank and remain editable.

---

## 7. Full User Control Over Certificate Fields

Every visible field in the certificate must be editable before issue.

Create a dedicated Certificate Editor with sections:

### Header Editor

- Company name
- Certificate title
- Format number
- Revision number/date
- Standard reference
- License number

### Certificate Information Editor

- Certificate number
- Certificate date
- Customer
- Invoice / Challan number
- Invoice date
- Delivery condition
- Material
- Grade

### Part Rows Editor

- Add row
- Remove row
- Reorder row
- Edit every cell

### Chemical Analysis Editor

For every element:

- Element name
- Specified minimum
- Specified maximum
- Observed value
- Unit
- Result

Allow adding and removing elements.

### Mechanical Properties Editor

For every property:

- Property name
- Minimum
- Maximum
- Observed
- Unit
- Result

Allow adding and removing properties.

### Micro Structure Editor

For every property:

- Property name
- Minimum
- Maximum
- Observed
- Unit
- Result

Allow adding and removing properties.

### Additional Tests Editor

Default rows:

- Surface and Dimensional Inspection
- Testing of Material
- Testing for Material Discrepancies
- Ultrasonic Testing

Allow custom rows.

### Footer Editor

- Remarks
- Certification statement
- Company authorization text
- Tested by
- Reviewed by
- Approved by
- Signature image placeholder
- Stamp image placeholder

Provide "Reset to Parsed Data" and "Reset to Demo Data" actions.

---

## 8. Fix the Certificate "Not Found" Bug

The certificate details route must always work after creation, refresh, and direct navigation.

Use a consistent ID strategy:

```ts
interface Certificate {
  id: string;
  certificateNumber: string;
  // remaining fields
}
```

Navigation must use the database-style ID:

```ts
navigate(`/certificates/${certificate.id}`);
```

The detail page must first wait for the persisted Zustand store to hydrate. Do not show "Not Found" while hydration is still in progress.

Required states:

- Loading persisted data
- Certificate found
- Certificate truly not found

Create a reusable lookup method:

```ts
getCertificate(identifier: string) {
  return certificates.find(
    item => item.id === identifier || item.certificateNumber === identifier
  );
}
```

Additional rules:

- Generate a UUID once when creating the certificate.
- Never generate a new ID during render.
- Do not seed demo data on every refresh.
- Seed only when storage is empty.
- Do not delete user-created records when loading demo data.
- The list page, view button, edit button, preview button, and report-upload page must all use the same certificate ID.
- Include an error boundary and a useful recovery link.

Acceptance test:

1. Create a certificate.
2. Open its view page.
3. Refresh the browser.
4. Open the URL directly in a new tab.
5. The same certificate must still load.

---

## 9. Demo Data

Seed the application with at least:

- 8 clients
- 12 parts/products
- 20 simplified heat records
- 10 certificates
- 3 reports attached to at least 3 certificates

Include the exact demo record used by the supplied PDFs:

- Customer: Apex Engineering Private Limited
- Part Name: Ductile Iron Pump Housing
- Part No.: PH-801
- Quantity: 801 Nos.
- Daily Heat No.: A6A
- Monthly Heat No.: AY-001
- Yearly Heat No.: 2026
- Batch No.: B-0726-04
- Material: SG Iron / Ductile Iron
- Grade: IS 1865 SG 500/7
- Certificate No.: TC-2026-000184

Add a "Load A6A Demo" button that creates or opens this record.

---

## 10. Required Pages

Routes:

```txt
/login
/dashboard
/heat-records
/heat-records/new
/heat-records/:id
/heat-records/:id/edit
/certificates
/certificates/new
/certificates/:id
/certificates/:id/edit
/certificates/:id/upload-reports
/certificates/:id/review
/certificates/:id/preview
/settings
```

The system should be focused. Do not add unnecessary laboratory, standard-management, role-management, or complex analytics modules unless they are needed for this workflow.

---

## 11. UI Requirements

Create a professional factory/quality-control dashboard.

- Clean light theme
- Optional dark mode
- Left sidebar
- Compact top bar
- Dense but readable forms
- Clear table borders
- Small status badges
- Responsive layout
- Loading skeletons
- Empty states
- Error states
- Toast notifications
- Confirmation dialogs

Avoid oversized marketing sections, excessive gradients, and decorative animation.

---

## 12. Data Model

```ts
interface HeatRecord {
  id: string;
  clientName: string;
  partName: string;
  partNumber: string;
  quantity: number;
  quantityUnit: string;
  dailyHeatNumber: string;
  monthlyHeatNumber?: string;
  yearlyHeatNumber?: string;
  batchNumber?: string;
  material?: string;
  grade?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryCondition?: string;
  productionDate?: string;
  remarks?: string;
  status: 'ACTIVE' | 'USED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

type TestResult = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'PENDING';

interface CertificatePartRow {
  id: string;
  quantity: string;
  partNumber: string;
  description: string;
  dailyHeatNumber: string;
  monthlyHeatNumber?: string;
  yearlyHeatNumber?: string;
  batchNumber?: string;
}

interface TestParameterRow {
  id: string;
  label: string;
  minimum?: string;
  maximum?: string;
  observed?: string;
  unit?: string;
  result: TestResult;
}

interface UploadedReport {
  id: string;
  reportType: 'CHEMICAL' | 'MECHANICAL' | 'MICRO_STRUCTURE';
  fileName: string;
  fileSize: number;
  parsedText: string;
  parsedValues: Record<string, string>;
  status: 'UPLOADING' | 'PARSING' | 'READY' | 'ERROR';
  errorMessage?: string;
}

interface Certificate {
  id: string;
  certificateNumber: string;
  certificateDate: string;
  companyName: string;
  customerName: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  deliveryCondition?: string;
  material?: string;
  grade?: string;
  formatNumber?: string;
  revisionText?: string;
  standardReference?: string;
  licenseNumber?: string;
  parts: CertificatePartRow[];
  chemicalRows: TestParameterRow[];
  mechanicalRows: TestParameterRow[];
  microStructureRows: TestParameterRow[];
  additionalTests: Array<{ id: string; label: string; value: string }>;
  remarks?: string;
  reports: UploadedReport[];
  status: 'DRAFT' | 'REPORTS_PENDING' | 'READY' | 'ISSUED';
  createdAt: string;
  updatedAt: string;
}
```

---

## 13. Calculation Rules

Recalculate row result when minimum, maximum, or observed values change.

- If the value is within limits: PASS
- If the value is outside limits: FAIL
- If the value is text such as NIL, N/A, Detected, or Not Detected, allow manual result selection
- The user can override any automatically calculated result

Overall certificate result:

- PASS when all required rows are PASS or acceptable N/A
- FAIL when any mandatory row is FAIL
- CONDITIONAL when any row is conditional and none is fail

The user can manually override the final result with a required reason.

---

## 14. Certificate PDF Output

Use A4 landscape.

The output must:

- Fit on one page for the provided demo data when possible
- Use compact typography
- Use black borders and white/gray backgrounds
- Preserve all edited values
- Show the exact part and heat details
- Show the three test sections
- Include additional tests and remarks
- Show an authorization block
- Download with a meaningful name, for example:

```txt
TC-2026-000184_Apex-Engineering.pdf
```

The PDF preview must never use mock data when actual certificate state exists.

---

## 15. Required Demo Test

The finished app must pass this exact test:

1. Start the application.
2. Log in or continue in demo mode.
3. Open the A6A demo certificate.
4. Upload `01_Chemical_Analysis_Report_A6A.pdf`.
5. Upload `02_Mechanical_Properties_Report_A6A.pdf`.
6. Upload `03_Micro_Structure_Report_A6A.pdf`.
7. Confirm that common data and all test values are extracted.
8. Edit any extracted value.
9. Open certificate preview.
10. Confirm the edited value appears in the preview.
11. Download the final certificate PDF.
12. Refresh the page.
13. Open the certificate detail page again.
14. Confirm the certificate does not show "Not Found" and all saved data remains available.

---

## 16. Deliverables

Return a complete working project, not only isolated snippets.

Include:

- Full Vite source code
- Tailwind and shadcn configuration
- All routes
- Zustand stores
- Zod schemas
- Seed data
- PDF.js extraction utility
- Report parsers
- Certificate editor
- Certificate preview
- PDF download
- README with setup commands and demo workflow

Commands must work:

```bash
npm install
npm run dev
npm run build
npm run lint
```

The final project must build without TypeScript errors.
