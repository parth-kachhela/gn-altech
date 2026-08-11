# Session Summary

## Objective Completed
Internal rebuild of the GN ALTECH certificate app completed. The app is now driven entirely by the
user's `GN_Altech_Demo_Master.xlsx` (Product Master → Heat Codes/Heats → Report Cards → Final Review
→ Issue). Client/Item legacy models were fully removed, and the app ships clean (no auto-seed).

## Work Completed

### 1. Types (`src/types/index.ts`)
- `ProductMaster` / `MasterSection` / `MasterParameter` (SAP No., part, material, customer + grouped sections/params)
- `HeatRecord` (`sapNo`, `heatCode`, `batchNo`, `quantity`, `heats: HeatSample[]`, `demoReports`)
- `Certificate` (`productMasterId`, `productSnapshot`, `selectedHeats`, `reviewed`, `issuedAt`,
  `testedBy`/`reviewedBy`/`approvedBy`, `invoiceNumber`/`deliveryCondition`/`remarks`)
- `ReportRecord` (`sourceType` UPLOADED|REPEATED|SUGGESTED|MANUAL|DEPARTMENT|DEMO, `confirmed`,
  `parsedValues`, `warnings`, `departmentRequestId`), `DepartmentRequest`, `AuditLog`, `AppUser`
- Removed legacy: `Client`, `Item`, `CertificateItem`, `CertificateHeatRecord`, `TestParameterRow`, `UploadedReport`

### 2. Lib
- New: `certificateNo.ts` (`TC-YYYY-NNNNNN`), `certificateStatus.ts` (deriveCertificateStatus,
  reportCardStatus, completionSummary, reportFor), `validation.ts` (`validateValue`,
  `matchParameter`), `specParser.ts`, `numeric.ts`, `nearAround.ts`, `masterFactory.ts`,
  `fileStorage.ts` (idb-keyval `gn-report:`), `migration.ts`, `permissions.ts`
- Roles remapped: `SUPER_ADMIN` / `QA_ADMIN` / `DEPARTMENT_UPLOADER`; `departmentForSectionKey()`
- Deleted legacy: `factories.ts`, `certDefaults.ts`, `result.ts`, `useSeedDemo.ts`

### 3. Stores (`src/stores/`)
- Rewritten: `productMasterStore` (gn-alt-product-masters), `heatRecordStore` (v3),
  `certificateStore` (v3), `authStore` (v2 w/ role migration), `departmentRequestStore`, `auditStore`, `usersStore`
- Deleted legacy: `clientStore.ts`, `itemStore.ts`

### 4. Services
- New: `masterImport.ts` (`parseMasterWorkbook`), `masterExport.ts`, `parsers/` (`chemical.ts`,
  `hardness.ts`, `tensile.ts`, `micro.ts` OCR via tesseract.js, `generic.ts`, `common.ts`, `index.ts`),
  rewritten `excelExport.ts` (Certificate Summary / Heat Summary / per-section / Audit sheets),
  rewritten `certificatePdf.tsx` + `TestCertificateDocument.tsx`
- Deleted legacy: `reportParser.ts`, `reportMerge.ts`, `pdfExtract.ts` kept

### 5. Pages
- New/rewritten: `MasterImportPage`, `ProductMastersPage`, `ProductMasterDetailPage`,
  `HeatRecordsPage`, `HeatRecordNewPage`/`EditPage`/`DetailPage`, `CertificateWizardPage`
  (sap→heats→reports→review→issue), `CertificatesPage`, `CertificateDetailPage`,
  `DepartmentRequestsPage`, `DepartmentInboxPage`, `DashboardPage`, `SettingsPage` (Reset + Clear, no re-seed)
- Deleted legacy: `ClientsPage`, `ClientFormPage`, `ItemsPage`, `ItemFormPage`, old wizard pages

### 6. Components
- New: `components/certificate-flow/` (`ReportCard`, `ReportWorkspaceStep`, `ParsedReviewDialog`,
  `RepeatPreviousDialog`, `NearAroundDialog`, `ReportStatusBadge`, `FinalReviewStep`, `IssueStep`)
- New: `components/master/` (`ParameterRowEditor`, `SectionEditor`, `MasterEditorDialog`)
- Deleted legacy: `components/certificate-wizard/`, `components/StatusBadge.tsx`

### 7. Demo Reports
- 64 files copied to `public/demo-reports/<SAP>/<HeatCode>/...`; loadable via "Load Demo" after
  workbook import maps them via Report Index sheet.

## Verification
- `npx tsc -b --noEmit`: 0 errors
- `npm run lint`: oxlint passes (pre-existing shadcn/ui warnings only)
- `npm run build`: succeeds (pre-existing chunk-size warning only)

## Remaining / Known Gaps
- App has no demo data on first run; user must import `GN_Altech_Demo_Master.xlsx` via Product Masters → Import.
- `README.md` still describes the old client/item workflow and should be updated to the SAP master flow.
