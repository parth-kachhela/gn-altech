# GN ALTECH Test Certificate Generator

A complete frontend demo for generating industrial **Test Certificates** (chemical analysis, mechanical properties and micro structure) for castings, matching the reference certificate layout in `04_Expected_Generated_Test_Certificate.pdf`.

Stack: **React 19 + Vite 8 + TypeScript (strict) + Tailwind CSS v4 + shadcn/ui (Radix)**. Runs fully in the browser (demo mode, no backend) — data is persisted via `localStorage` (zustand) and `idb-keyval`.

## Getting started

```bash
npm install
npm run dev        # start dev server
npm run build      # type-check (tsc -b) + production build
npm run lint       # oxlint
```

Open the printed URL (e.g. `http://localhost:5173`). Log in with the demo credentials shown on the login page.

## How it works

- **No backend** — everything runs client-side. A demo dataset is seeded on first login.
- **Heat numbers are manual** — the app never auto-generates a heat number. Duplicates are detected only against `Daily Heat No.`
- **Report types** (exact names): `Chemical Analysis`, `Mechanical Properties`, `Micro Structure`
- **Upload → Parse → Review → Preview** workflow:
  1. Upload the three lab PDF reports for a certificate (drag & drop).
  2. Text is extracted with pdfjs-dist and parsed (`KEY=VALUE` machine-readable lines first, then a human-table fallback).
  3. Common fields and test rows are confirmed/edited in the Review screen.
  4. The certificate preview is a real generated PDF (A4 landscape, via `@react-pdf/renderer`).
  5. Download as PDF or multi-sheet Excel (`.xlsx`).

## 14-step acceptance demo

1. **Login** — `demo` / `demo123` (any non-empty credentials also work; user is persisted).
2. **Dashboard** — verify seeded summary cards (heat records, certificates, pass/fail) load after hydration.
3. **Load the A6A demo** — sidebar → **Load A6A Demo Reports** → opens certificate `TC-2026-000184` with the 3 embedded reports.
4. **Upload reports** — open `TC-2026-000184` → **Upload Reports** → use **Load A6A Demo Reports** (bundled PDFs) or drag the files from `public/demo/`. Watch parsing progress.
5. **Review common data** — confirm `Apex Engineering Private Limited`, `Ductile Iron Pump Housing`, `PH-801`, `801 Nos.`, Daily `A6A`, Monthly `AY-001`, Yearly `2026`, Batch `B-0726-04`, Invoice `INV-2026-0814`, Delivery `As Cast`.
6. **Review test values** — confirm chemical (C 3.070, Si 1.700, Mn 0.742, P 0.057, S 0.080, Cr 0.320, Mg 0.045, Cu 0.576, Sn 0.046, Mo 0.000), mechanical (YS 320, UTS 520, Elong 8.5 %, Hardness 238 BHN), micro (Nodularity 85 %, Nodule 180/mm², Pearlite 40, Ferrite 60, Carbide NIL), all `PASS`.
7. **Edit a value** — change e.g. a chemical observed value; the row result and overall result recompute.
8. **Preview** — Preview page renders the real A4 landscape PDF: company header, TEST CERTIFICATE, Format/Rev, 4 header rows, parts table, grouped chemical columns, `Elongation % / Hardness BHN → >= 7 / 180-250` and `8.5 / 238`, `Pearlite / Ferrite → 30-50 / 50-70` and `40 / 60`, Carbide `NIL`, Additional Tests + Authorization, Remarks.
9. **Download PDF** — `TC-2026-000184_Apex-Engineering-Private-Limited.pdf`.
10. **Download Excel** — multi-sheet workbook (Certificate / Parts / Chemical / Mechanical / Micro Structure / Additional Tests / Remarks).
11. **Create a certificate from a heat record** — Heat Records → A6A → **Use in Certificate** → form pre-filled, heat marked `USED`, new number `TC-2026-000185` suggested.
12. **Duplicate heat check** — creating another certificate with Daily Heat No. `A6A` is blocked.
13. **Persistence** — refresh any page: data survives; hydration-safe routing means no “Not Found” on direct/refresh navigation.
14. **Issue certificate** — detail page → **Issue** → status becomes `ISSUED` with timestamp.

## Demo data

- `src/data/heatRecords.ts` — 20 heat records (includes `A6A`)
- `src/data/certificates.ts` — 10 certificates; `TC-2026-000184` (`A6A`) embeds the 3 parsed reports and drives “Reset to Demo Data”
- `public/demo/` — the three lab PDFs + the expected reference certificate

## Project structure

```
src/
  components/
    pdf/TestCertificateDocument.tsx   # A4 landscape certificate model (preview + download)
    certificates/                    # form, table, detail, upload card, editors
    heat-records/                    # form, table
    layout/                          # AppLayout, Sidebar, TopBar
    ui/                              # shadcn/ui components
  data/                              # demo seed data
  lib/                               # utils, factories, result calc, ids
  pages/                             # all routes
  services/                          # pdfExtract, reportParser, reportMerge, certificatePdf, excelExport
  stores/                            # zustand stores (settings, theme, auth, heat records, certificates)
  types/                             # domain types
```
