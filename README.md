# GN ALTECH Test Certificate Platform

Industrial **Test Certificate Generation & Lab Workflow System** for castings and foundries, designed for GN ALTECH. Aggregates laboratory test reports (Chemical Analysis, Mechanical/Tensile Properties, Hardness, and Micro Structure), validates measured values against Product Master specification rules, and generates official A4 landscape Test Certificates (PDF) and customer Excel summaries.

Stack: **React 19 + Vite 8 + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui (Radix) + Express / Prisma / PostgreSQL Backend**.

---

## Getting Started

### 1. Backend Service

```bash
cd gn-altech-backend
npm install
npx prisma generate
# When connecting to PostgreSQL:
# npx prisma migrate deploy
# npm run seed
npm run dev        # Starts backend on http://localhost:4000
```

### 2. Frontend Application

```bash
cd gn-altech
npm install
npm run dev        # Starts frontend on http://localhost:5173
npm run build      # Type-check (tsc -b) + production build
npm run lint       # oxlint check
```

---

## Core Architecture & Workflow

- **Product Master Centric**: Specifications (SAP No, Part No, Customer, Grade, Material) define the required test sections and acceptable parameter ranges (Min, Max, Expected).
- **Manual Heat Numbers**: Heat codes and daily/monthly/yearly heat identifiers are entered manually per factory practice; duplicates are rejected.
- **Four Lab Report Sections**:
  1. `Chemical Analysis` (Spectrometer analysis: C, Si, Mn, P, S, Cr, Mg, Cu, Sn, Mo, Fe, etc.)
  2. `Tensile / Mechanical Properties` (UTS, 0.2% Yield Limit, Elongation %, Force, Displacement)
  3. `Hardness` (Multi-point BHN readings and calculated average)
  4. `Micro Structure` (Nodularity %, Nodule Count, Pearlite %, Ferrite %, Carbide)
- **Role-Based Access Control**:
  - `SUPER_ADMIN`: Full system access, Product Master import, User management, Issue certificates.
  - `QA_ADMIN`: Full certificate lifecycle, value review & confirmation, heat management.
  - `DEPARTMENT_UPLOADER`: Assigned lab inbox, report file uploads and parsing review.

---

## 14-Step Acceptance Demo

1. **Login & RBAC** — Log in with `superadmin` / `Admin@123` (or demo role accounts `chemical`, `tensile`, `micro`, `hardness`).
2. **Dashboard Overview** — View live summary cards: Total Heats, Heats Ready for Certificate, Pending Lab Reports, and Issued Certificates.
3. **Import Product Master** — Navigate to **Product Masters** → **Import Master** → Upload `Master.xlsx` (or `GN_Altech_Demo_Master.xlsx`) to populate SAP numbers, grades, and parameter limits.
4. **Create Heat Record** — Navigate to **Heat Records** → **New Heat Record** → Select SAP `PR01CI0459CA`, enter Heat Code `GZ-56`, Batch `B-0726-04`, Quantity `801 Nos.`.
5. **Department Requests** — Create test requests for Chemical, Tensile, Hardness, and Micro departments.
6. **Chemical Lab Report Upload** — Upload `01.Chemical data/03. GZ-56 P COVER.pdf` → System parses spectrometer channels (C 3.06%, Si 1.83%, Mn 0.79%, P 0.049%, S 0.088%, Cu 0.472%).
7. **Tensile Lab Report Upload** — Upload `03.Tensile data/03. GZ-56 P-COVER.pdf` → System extracts UTS `253.9 N/mm²`, Elongation `10.0%`, Force `12860 N`.
8. **Hardness Lab Report Upload** — Upload `04.Hardness data/03. P. Cover 934 (GZ-56).pdf` → System reads multi-indentation BHN readings (`202`, `201`, `204`, `211`...) and computes average `205 BHN`.
9. **Micro Structure Lab Ingest** — Upload `02.Micro data/03. GZ-56 P COVER.bmp` → Microstructure image attached; enter confirmed Nodularity (`85%`), Pearlite (`40%`), Ferrite (`60%`), Carbide (`NIL`).
10. **Specification Validation & Review** — Review observed values against master specifications; verify automatic calculation of parameter `PASS`/`FAIL` and overall Section status.
11. **Create Certificate from Heat** — From Heat Records or Certificate Wizard, select completed heat `GZ-56` → System pre-fills product snapshot, generates unique sequence `TC-2026-000184`.
12. **Certificate Preview** — Inspect real-time A4 landscape PDF preview: GN ALTECH header, format & rev metadata, part details, grouped chemical table, mechanical/micro test blocks, and authorization signatures.
13. **Issue Certificate** — Click **Issue Certificate** → Certificate locks with issuer identity, timestamp, and status `ISSUED`.
14. **Export Deliverables** — Download final A4 Landscape PDF (`TC-2026-000184.pdf`) and multi-sheet customer Excel report (`TC-2026-000184.xlsx`).

---

## Project Structure

```
gn-altech/
├── src/
│   ├── components/
│   │   ├── certificate-flow/        # Report cards, parsed review dialog, final review, issue step
│   │   ├── certificates/            # Certificate list, detail, and preview views
│   │   ├── heat-records/            # Heat form, tables, and sample management
│   │   ├── master/                  # Product master editor dialogs and parameter editors
│   │   ├── pdf/                     # TestCertificateDocument.tsx (A4 landscape PDF renderer)
│   │   ├── layout/                  # AppLayout, Sidebar, TopBar, Navigation
│   │   └── ui/                      # Radix / shadcn/ui components
│   ├── data/                        # Demo fixtures and lab manifests
│   ├── lib/                         # Validation, spec parser, numeric utils, permissions
│   ├── pages/                       # Dashboard, Heats, Masters, Certificates, Dept Inboxes
│   ├── services/                    # PDF/Excel generation, lab report parsers, API client
│   ├── stores/                      # Zustand state management (masters, heats, certs, auth)
│   └── types/                       # Core TypeScript domain models
gn-altech-backend/
├── prisma/                          # Schema (User, ProductMaster, Heat, Certificate, AuditLog)
└── src/
    ├── middleware/                  # JWT auth, RBAC permissions, error handling
    ├── parse/                       # Server-side report parser fallback
    ├── routes/                      # /auth, /users, /masters, /heats, /certificates, /dashboard
    └── services/                    # File storage and persistence
```
