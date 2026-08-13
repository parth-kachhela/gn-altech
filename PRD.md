# Product Requirements Document (PRD) — GN Altech Test Certificate Platform

| Field | Value |
|---|---|
| **Product** | GN Altech Test Certificate Platform |
| **Version** | 1.0 |
| **Status** | Draft — for client sign-off |
| **Date** | August 2026 |
| **Author** | Engineering |
| **Build model** | Full backend (Node) + Tauri desktop application (Windows-first) |

---

## 1. Executive Summary

GN Altech (a castings/foundry manufacturer) needs production software to **generate industrial Test Certificates** (Chemical Analysis, Mechanical Properties, Tensile, Hardness, Micro Structure) from laboratory reports, and to manage the full certification workflow. The platform is delivered as two integrated parts:

1. **Backend** — a Node.js (Bun) API with PostgreSQL, Redis, role-based access control, and a report-parsing pipeline with AI-assisted fallback. It runs on a private VPS and is reachable over the internet.
2. **Desktop application** — a **Tauri (Rust) Windows application** that the foundry staff install on their machines. It must have **internet access** because it calls the backend API for all data, parsing, and certificate generation. There is **no website/web app** and **no offline mode**.

The product is built for **GN Altech only** (single tenancy; no multi-tenant SaaS requirement).

---

## 2. Background

Foundries must issue Test Certificates with every product delivery. A certificate aggregates laboratory test reports (chemical composition, mechanical properties, tensile strength, hardness, and micro-structure analysis) for the heats poured against a given product, checks each measured value against the product's specification rules, and produces a formal PDF certificate plus an Excel summary for the customer.

Today this is a manual, error-prone process. This project replaces it with a structured, auditable, role-based system that:

- Centralizes product master data and specification rules.
- Captures heat records and routes test requests to the relevant departments.
- Imports lab reports and extracts measured values automatically.
- Validates every value against the specification and flags PASS / FAIL.
- Generates the final certificate (PDF) and Excel deliverables.
- Tracks who did what, when, for QA and audit purposes.

---

## 3. Goals & Non-Goals

### Goals (v1)
1. **Production, multi-user system** — concurrent access by foundry staff through a shared, authoritative database on the VPS.
2. **Windows desktop application (Tauri)** — the only client; installed on foundry machines, **requires internet** to work against the backend API.
3. **Reliable report parsing** — OCR + rules-based extraction as the fast path; **AI fallback (Qwen/Gemma on the private VPS)** for complex or unreadable reports.
4. **Complete auditability** — every create/edit/issue tracked for QA and customer-trust purposes.
5. **Specification-driven validation** — measured values are checked against product rules; the certificate reflects only confirmed, validated data.

### Non-Goals (v1)
- Any website / browser-based / hosted web application.
- Offline mode — the app requires internet; there is no offline cache or sync.
- Mobile/native iOS–Android apps.
- Multi-tenancy / selling as SaaS to other foundries.
- Direct integration with lab instruments (reports are imported, not instrument-linked).
- Guaranteed 100% OCR accuracy — human review remains mandatory (industry two-man rule).
- Integrated accounting/ERP — invoice/output is a certificate field, not a module.

---

## 4. Users & Roles

| Role | Department | Capabilities |
|---|---|---|
| **SUPER_ADMIN** | Management / IT | All access; manage users & roles; product master import/edit; reset/clear data; view audit log; issue certificates. |
| **QA_ADMIN** | QA | Full certificate workflow; confirm parsed values; review & approve; reassign; create certificates from heat records; view audit log. |
| **DEPARTMENT_UPLOADER** | Lab / Testing dept | Upload report files for assigned department; respond to department requests; view only heat/certificate data relevant to uploads + comments. |

Permission enforcement is **server-side** (RBAC middleware) — client-side guards are UX only.

---

## 5. Feature Scope (Prioritized)

P0 = must-have for v1, P1 = important, P2 = later.

### 5.1 Authentication & Users — **P0**
- Username + password auth, JWT access + refresh tokens, session management.
- Password hashing (bcrypt/argon2), lockout + rate limiting.
- Role assignment and user CRUD (SUPER_ADMIN only).
- Client receives user profile + role; server enforces all authorization.

### 5.2 Product Master Management — **P0**
- CRUD for `ProductMaster` (SAP No., part no., description, material, customer, grade, revision, status).
- `MasterSection` (CHEMICAL / MECHANICAL / HARDNESS / MICRO / TENSILE), each with required flag, file-type hint, and a `MasterParameter` list (rule type, min/max/expected, unit, aliases, required, order).
- Excel **import** of the product master workbook → parse → validate → upsert, with a conflict/error report.
- Excel **export** of the current master.
- Revision tracking and a parameter editor UI.

### 5.3 Heat Records — **P0**
- CRUD heat records (SAP No., heat code, batch no., quantity, date, status ACTIVE/INACTIVE).
- Sample management (sample labels with quantity; heat-code prefix + A/B/C… labeling).
- Reports and test requests attached to a heat.
- "Use in Certificate" action with `USED` tracking + duplicate-heat validation against daily heat numbers.

### 5.4 Report Ingest & Parsing Pipeline — **P0** (core risk area)
Inputs: lab PDFs (chemical / tensile / hardness) and image files (micro-structure).

**Fast path (no AI):**
1. PDF → text via a PDF text-extraction engine (in-app).
2. Image → OCR (in-app).
3. Per-report-type extractors (chemical / tensile / hardness / micro / generic).
4. Machine-readable `KEY=VALUE` lines first, then rules-based column/label matching.
5. Confidence score and warnings per report.

**AI fallback (complex / failed files only):**
- Triggered when: confidence is below threshold, zero values extracted, extraction warnings indicate failure, or the user explicitly requests it.
- Sends the extracted raw text (or OCR output) to the AI service (Qwen or Gemma via Ollama on the private VPS).
- Model returns **structured JSON** (`{ parameters: [{ name, value, unit }] }`).
- AI output is merged into the review screen where a human **must confirm** before it counts.
- AI decisions are logged (model, prompt, raw input, output, latency) to the audit trail.

**Parsed values are never silently trusted** — AI/rules results always land in `NEEDS_REVIEW`, never auto-complete.

### 5.5 Specification Validation Engine — **P0**
- Runs rule types (Range / Minimum / Maximum / ExactNumber / ExactText / Informational) per parameter against the product master.
- Roll-up: parameter → section → certificate overall PASS / FAIL / WARNING.
- Live recompute on any edit (row + overall result).
- Explicit handling of missing / non-numeric / `NOT_VALIDATED` values.

### 5.6 Certificate Workflow — **P0**
- Wizard: select product master → select heat/samples → attach/verify reports per section → review confirmed values → final review → issue.
- Certificate fields: certificate date, invoice number/date, delivery condition, remarks, testedBy / reviewedBy / approvedBy.
- Certificate numbering `TC-YYYY-NNNNNN` server-generated, gap-free; duplicate heat and duplicate number rejected transactionally.
- Status lifecycle: DRAFT → REPORTS_PENDING → WAITING_FOR_DEPARTMENT → READY_FOR_REVIEW → REVIEWED → ISSUED.
- Issue sets issuer + timestamp; issued certificates are locked from silent edits (correction flow is P1).

### 5.7 Department Requests — **P0**
- Request reports from a department for a specific heat/sample/section; priority + comment thread.
- Statuses: PENDING → IN_PROGRESS → UPLOADED → REVIEWED → CANCELLED.
- `DEPARTMENT_UPLOADER` processes from an inbox; uploads link back to the certificate/heats.
- In-app notifications + email (P1) on assignment and completion.

### 5.8 PDF & Excel Generation — **P0**
- Certificate PDF: A4 landscape, company header, TEST CERTIFICATE, format/rev, header rows, parts table, grouped chemical columns, mechanical/micro rows, Additional Tests + Authorization — matching the company's approved certificate layout.
- Library: **`@react-pdf/renderer`** — used in the desktop app and server-side on issue.
- Excel export: multi-sheet workbook (Certificate / Parts / Chemical / Mechanical / Micro Structure / Additional Tests / Remarks) via **`exceljs`** (server), with the import path using **`xlsx`/SheetJS**.

### 5.9 Audit Trail & Dashboard — **P0**
- Every create/update/issue/parse/log-AI-parse recorded: `AuditLog` (user, action, entity, before/after, timestamp).
- Dashboard: summary cards — heat records, certificates, pass/fail rollups, pending department requests, recent activity.

### 5.10 Desktop Application (Tauri) — **P0**
- A **Windows-first** Tauri (Rust) desktop application embedding the React UI.
- **Internet is mandatory:** all data operations hit the backend API; there is no offline mode.
- **Native features:** file watcher for a configured drop folder (auto-ingest new lab reports into the upload flow), native file open/save dialogs, OS print, auto-update (Tauri updater).
- Secure storage of credentials/tokens (OS keychain-backed), signed Windows installer (`.msi`/`.exe`), optionally macOS `.dmg`.
- Failures surface clearly when the API is unreachable (connection state banner + retry).

### 5.11 Notifications — **P1**
- In-app bell + email (SMTP) for: department request created, uploaded, reviewed, certificate issued, multi-user comments.

---

## 6. Technical Architecture

### 6.1 Deployment Topology (private VPS — 2 vCPU / 4 GB)

```
   ┌──────────┐        HTTPS        ┌────────────────────────────────┐
   │  Tauri   │◄───────────────────►│         PRIVATE VPS (Linux)   │
   │ Desktop  │    (API + files)    │                                │
   │ (Windows)│                     │  ┌────────────┐ ┌────────────┐ │
   └──────────┘                     │  │ Reverse    │ │ Node/Bun   │ │
                                    │  │ proxy +    │►│ API server │ │
                                    │  │ TLS        │ │ (Express)  │ │
                                    │  └────────────┘ └─────┬──────┘ │
                                    │                       ▼        │
                                    │  ┌─────────────┐ ┌───────────┐ │
                                    │  │ PostgreSQL  │ │  Redis    │ │
                                    │  │ (Prisma)    │ │ (cache/   │ │
                                    │  │             │ │  queues)  │ │
                                    │  └─────────────┘ └───────────┘ │
                                    │  ┌──────────────────────────┐  │
                                    │  │ Ollama (Qwen / Gemma)    │  │
                                    │  │ AI fallback service      │  │
                                    │  └──────────────────────────┘  │
                                    └────────────────────────────────┘
```

- **One VPS** hosts reverse proxy/TLS, the API, PostgreSQL, Redis, and Ollama. Backups to object storage / off-site daily.
- All server services containerized with **Docker + docker-compose**; Kubernetes is out of v1 scope.
- The **Tauri desktop app is the only client**; it connects to the VPS API URL over HTTPS and **requires internet**.

### 6.2 Data Flows
1. **Upload → Parse → Review → Preview:** desktop uploads files to the API → stored in DB/volume → fast-path extraction (text/OCR) runs in-app → low confidence → API calls Ollama → structured values merged → review/confirm → validated against product spec → final review → issue.
2. **Product master import:** workbook upload → parse → validation report → upsert.
3. All reads/writes are online API calls; the desktop app holds **no offline data**.

### 6.3 Data Model (Prisma, PostgreSQL)
- `User`, `AuditLog`
- `ProductMaster` → `MasterSection` → `MasterParameter`
- `HeatRecord` → `HeatSample`, `HeatReportRequest`, `HeatReportData`
- `Certificate` → `CertificateHeatSelection` → `ReportRecord` (source types: UPLOADED / REPEATED / SUGGESTED / MANUAL / DEPARTMENT)
- `DepartmentRequest` → `RequestComment`
- `JobLog` / `AiInferenceLog`

---

## 7. Tech Stack (locked per decision)

| Layer | Technology |
|---|---|
| Backend runtime | **Bun** (Node-compatible server) |
| Backend framework | **Express.js** with typed service modules |
| Language | **TypeScript** (strict), shared types package |
| Database | **PostgreSQL** with **Prisma ORM** |
| Cache / queues | **Redis** (session store, job queue, rate limit) |
| Logging | **Pino** (structured JSON logs) |
| Containers / deploy | **Docker**, docker-compose, CI/CD |
| Frontend | **React + TypeScript + Tailwind CSS + shadcn/ui** |
| State / data | **Zustand** (local UI state), **TanStack Query** (server state/cache) |
| Tables | **TanStack Table** |
| Desktop | **Tauri (Rust shell)** — Windows-first, file watcher, auto-update |
| AI | **Qwen or Gemma** via **Ollama** on the private VPS; JSON-structured extraction |
| Image OCR | **tesseract.js** (in-app fast path) |
| PDF text extraction | **pdfjs-dist** |
| PDF generation | **@react-pdf/renderer** (desktop + server) |
| Excel | **exceljs** (server streams), **xlsx/SheetJS** (import + quick export) |
| Auth | JWT + refresh, argon2/bcrypt, RBAC middleware |

---

## 8. AI Usage Policy & Cost Ownership

1. **Default path is free:** OCR + rules-based extraction. Zero AI cost for the ~90–95% of routine reports.
2. **AI is a fallback:** triggered only for complex/failed files (low confidence, unparseable tables, scanned layouts) or explicit user request.
3. **Inference location:** Ollama on the private VPS.
4. **Cost ownership:** all AI-related infrastructure costs (VPS upgrade for GPU/RAM, larger instance, or hosted inference API tokens) are **borne by the client** (GN Altech).
   - Note: small models (Qwen 0.5–4B, Gemma 2–4B Q4) run on CPU at a few seconds/inference; a 2vCPU/4GB VPS will be slow. Recommended (client-funded): an AI node with ≥8 GB RAM, or a GPU instance / on-prem Ollama host.
5. **Every AI-assisted parse is logged** (model, prompt hash, latency, output) and **requires human confirmation**. Nothing AI produces bypasses review.

---

## 9. Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Security** | Encryption in transit (TLS) and at rest (DB + file storage); short-lived JWTs + refresh; argon2/bcrypt password hashing; rate limiting; server-side RBAC; session invalidation; no secrets in repository/UI. |
| **Connectivity** | App requires internet to the VPS API; shows a clear offline/unreachable banner and retry; no data loss if a request fails mid-save (transactional APIs + retry). |
| **Performance** | API p95 < 300 ms for reads under 20 concurrent users; dashboard < 1.5 s; PDF render < 3 s; routine report parse < 10 s. |
| **Availability** | VPS uptime target 99.5%; health checks + auto-restart on crash (Docker restart policy); no data loss on power failure (Postgres WAL + backups). |
| **Backup** | Daily full Postgres dump + nightly file snapshot off-site; 30-day retention; documented restore drill. |
| **Audit** | Immutable append-only audit log; no silent deletes of reviewed/issued data. |
| **Capacity** | Single-tenant; target ≤ 20–50 users, ≤ 1,000 certificates/yr. 2vCPU/4GB is sufficient **minus AI**; see §8 for the AI node. |
| **Monitoring** | Pino logs shipped to a log viewer; uptime alerts; disk/RAM alerts. |
| **Localization** | English UI; locale-aware number/decimal handling. |
| **Legal/Data** | User data remains within foundry-controlled infrastructure (VPS/on-prem). |

---

## 10. Acceptance Criteria (Go-Live)

1. All three roles can log in from the Windows desktop app and access only permitted screens/APIs (server-enforced).
2. Product master is imported from the client workbook; its parameters drive validation.
3. Routine reports parse via the fast path without AI; complex/unparseable reports route to AI, land in `NEEDS_REVIEW`, and the inference is logged.
4. Full certificate wizard works end-to-end; numbering is sequential and gap-free; duplicate heat and duplicate number are rejected.
5. Certificate PDF matches the approved certificate layout; Excel export contains all required sheets.
6. Department request flow works with role-based inbox and comment thread.
7. Desktop app auto-updates; signed Windows installer installs cleanly on Windows 10/11.
8. Issuing a certificate sets status `ISSUED` with timestamp; issued certificates are locked from silent edit.
9. Audit log contains every significant action, including AI parse calls.
10. Backups automated and restore-tested; monitoring alerts active.
11. App communicates with the API only over HTTPS; a clearly visible message appears when the API is unreachable.

---

## 11. Out of Scope (v1)

- Any website / browser-hosted application.
- Offline mode, offline caching, or offline sync.
- Mobile apps.
- Multi-tenant SaaS / per-foundry billing.
- Direct integration with lab instruments and real-time data feeds.
- Automated adaptation to new lab report layouts (handled via AI fallback + human confirm).
- Full ERP/accounting integration.
- Kubernetes orchestration and horizontal autoscaling.

---

## 12. Assumptions & Dependencies

- Client provides the private VPS (2 vCPU / 4 GB minimum) and pays for any AI capacity upgrade (per §8).
- Foundry machines have internet access to the VPS API at all times during work.
- Desktop target is **Windows 10/11**; macOS support is optional (P1).
- Client supplies real lab report samples (PDF + image) covering the report styles in use, for parser + AI tuning.
- The client confirms the certificate layout, company header, and signatory data before go-live.
- Four developers are available for the build (see `TIMELINE.md`).

---

## 13. Rough Budget (Planning only — confirm with vendor rates)

| Stream | Calendar (4 devs) | Effort (dev-days) | Est. range |
|---|---|---|---|
| Backend (API, DB, auth, modules) | 7–9 wks | 55–80 | **$11k–24k** |
| Parsing + AI fallback pipeline | 3–4 wks | 8–12 | **$2k–4k** |
| Tauri desktop UI (full workflow) | 5–6 wks | 20–30 | **$4k–9k** |
| QA / hardening / deployment / UAT | 4–5 wks | 15–25 | **$3k–8k** |
| **Total** | **~16–18 wks** | **~98–147** | **~$20k–45k** |

> Add ~20–30% for PM/QA overhead and post-launch fixes. Hosting/credential costs and AI capacity are client-borne. Estimates assume ~$200–300/day offshore-equivalent rates; final quote per agreed rates.

---

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Lab report format changes break rules-based extraction | High | AI fallback (§5.4); human confirm; regression corpus of real reports |
| AI latency/reliability on 2 vCPU / 4 GB | Med | Client-funded AI node upgrade; async job queue; timeout + retry |
| VPS 4 GB RAM pressure (API + DB + Redis + AI) | Med | Keep AI off the main VPS if needed; monitor; documented upgrade path |
| Internet outages block work | Med | Clear unreachable banner + retry; transactional writes prevent data loss on retry |
| Scope creep (web / SaaS / mobile / ERP) | Med | Non-goals (§3/§11); change-control process |

---

*End of PRD. Next: `TIMELINE.md`.*