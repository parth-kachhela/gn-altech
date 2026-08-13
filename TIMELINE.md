# Timeline & Delivery Plan — GN Altech Test Certificate Platform

| Field | Value |
|---|---|
| **Team** | 4 developers (backend lead, backend II, frontend lead, frontend/desktop + infra) |
| **Model** | Fixed-scope, milestone-gated delivery (waterfall-ish with parallel workstreams) |
| **Duration** | ~16–18 calendar weeks build + 2 wks UAT buffer |
| **Target** | v1 go-live on the private VPS (2 vCPU / 4 GB) with AI node per PRD §8 |

> Note: totals align with `PRD.md §13`. Parallel streams overlap; "calendar time" ≠ sum of dev-days.

---

## Team Allocation

| Dev | Primary Stream | Secondary |
|---|---|---|
| **Dev 1** — Backend lead | API, DB design (Prisma), auth/RBAC, module APIs | Deployment |
| **Dev 2** — Backend | Parsing pipeline, AI fallback service, Redis queues, Excel/import | AI tuning |
| **Dev 3** — Frontend lead | Desktop UI to API (TanStack Query), validation UI, reports | Desktop integration |
| **Dev 4** — Frontend/Desktop + Infra | Tauri shell (Rust), Docker/VPS, CI/CD, monitoring | Auto-update, signing |

Parallel dependency rule: UI can be built against a stubbed API contract from Week 2; Desktop shell can start from Week 4.

---

## Phase 0 — Kickoff & Contract (Week 1)

| Task | Owner | Notes / Gate |
|---|---|---|
| Confirm PRD assumptions, master workbook, sample reports, VPS access | PM / Client | Client signs PRD |
| Provision VPS (or receive access), DNS, SSL cert plan | Dev 4 | |
| Set up repo (monorepo): `backend/`, `web/`, `desktop/`, `shared/` | Dev 1 | |
| CI skeleton (GitHub Actions: lint, typecheck, build) | Dev 4 | |
| API contract (OpenAPI) V0 for frontend stubs | Dev 1 | Gate 0: contract agreed |

---

## Phase 1 — Backend Foundation (Weeks 2–4)

| Task | Owner |
|---|---|
| Prisma schema (isomorphic to `src/types/index.ts`) + migrations | Dev 1 |
| RBAC + roles seed, JWT access/refresh, argon2, rate limit, Redis session | Dev 1 |
| Pino structured logging, error handling, validation (zod) middleware | Dev 1 |
| Express routes scaffold, health/readiness endpoints | Dev 1 |
| User CRUD (SUPER_ADMIN) + audit middleware | Dev 1 |
| Frontend API client (`shared/api` via TanStack Query) against stubs | Dev 3 |
| Auth store integration in desktop UI (login/logout, token refresh) | Dev 3 |
| Docker-compose (API, Postgres, Redis) + backups script | Dev 4 |

**Gate 1** (end Wk 4): Login works end-to-end on staging compose stack; CI green.

---

## Phase 2 — Core Backend Modules (Weeks 4–8)

| Task | Owner |
|---|---|
| Product Master CRUD + import/export endpoints (Excel) | Dev 1 |
| Heat Records CRUD + samples + "Use in Certificate" + duplicate checks | Dev 1 |
| Certificate CRUD + server-generated numbering (transactional, gap-free) | Dev 1 |
| Department Request workflow API + comments + status transitions | Dev 1 |
| File upload/storage endpoint (versioned, MIME whitelist, S3/volume) | Dev 2 |
| Spec validation engine server-side (port `lib/validation.ts` + section roll-up) | Dev 2 |
| Audit log service + dashboard aggregations | Dev 1 |
| Desktop UI module screens wired to API (master, heats, certificates, dept requests) | Dev 3 |

**Gate 2** (end Wk 8): All core APIs live; UAT-able wizard on staging with real data import.

---

## Phase 3 — Parsing & AI Fallback Pipeline (Weeks 6–10)

| Task | Owner |
|---|---|
| Port parsers (chemical/tensile/hardness/micro/generic) into `shared` (isomorphic, usable in-UI and server) | Dev 2 |
| Upload → parse endpoint: store file, run fast path, return structured result + confidence | Dev 2 |
| Redis job queue for AI inferences (async, timeout, retry) | Dev 2 |
| Ollama on VPS: install qwen2.5/gemma quantized, JSON-mode endpoint `extract-values` | Dev 2/4 |
| AI fallback trigger (confidence < threshold / zero values / explicit) + merge into `NEEDS_REVIEW` | Dev 2 |
| `AiInferenceLog` (model, latency, prompt hash, output) into audit trail | Dev 2 |
| Review/confirm screens wired to server results (reuse `ParsedReviewDialog`) | Dev 3 |
| Parser regression corpus: collect ~50 real reports (routine + complex) as test fixtures | Dev 2/Client |

**Gate 3** (end Wk 10): ≥90% routine reports parse via fast path; complex files route to AI with successful JSON; all land in review.

---

## Phase 4 — Desktop UI Complete (Weeks 8–12)

| Task | Owner |
|---|---|
| Certificate wizard fully online (final review → issue) | Dev 3 |
| Certificate PDF (react-pdf) — client preview + server render on issue | Dev 3 |
| Excel export (exceljs multi-sheet) server endpoint | Dev 2 |
| Dashboard, department inbox, settings, audit viewer | Dev 3 |
| Notifications (in-app bell, email SMTP) | Dev 3 |
| Role guards server + client parity pass | Dev 3/1 |
| Staging deploy on VPS; UAT environment | Dev 4 |

**Gate 4** (end Wk 12): Full desktop workflow complete; UAT begins.

---

## Phase 5 — Tauri Desktop Packaging (Weeks 9–15, parallel)

| Task | Owner |
|---|---|
| Tauri project scaffold (embed frontend bundle), Rust shell, IPC allowlist, secure token storage (OS keychain) | Dev 4 |
| Native file watcher: drop-folder auto-ingest of lab PDFs/BMPs into upload flow | Dev 4 |
| Native dialogs (file open/save), OS print integration | Dev 4 |
| Auto-update (Tauri updater) + code signing (Windows .msi/.exe, optional macOS .dmg) | Dev 4 |
| Cross-platform QA (Windows 10/11 primary, macOS ARM + Intel optional) | Dev 3/4 |
| Connectivity UX: API-unreachable banner, retry, no-offline-mode guarantee | Dev 3 |

**Gate 5** (end Wk 15): Desktop installs signed; auto-update functional; works against staging API.

---

## Phase 6 — QA, Hardening, UAT, Go-Live (Weeks 13–17)

| Task | Owner |
|---|---|
| Full regression: core user journeys end-to-end over backend | Dev 3/2 |
| Performance test: 20 concurrent users, PDF render, parse benchmarks; tune as needed | Dev 1 |
| Security pass: TLS, headers, secrets scan, rate limits, RBAC bypass tests | Dev 4 |
| Backup + restore drill; monitoring + uptime alerts active | Dev 4 |
| Client UAT (2 wks): real reports, real users, sign-off forms | PM / Client |
| Defect fixes prioritized queue (P0/P1 only before go-live) | All |
| Go-live: daily cutover runbook, data backfill/migration, DNS switch | Dev 4/PM |

**Gate 6 / GO-LIVE** (target end Wk 17): Acceptance criteria in `PRD.md §10` all pass; UAT signed.

---

## Post-Launch (Weeks 18–20)

- Warranty bug-fix window (30 days P0/P1).
- Handover: runbooks, documentation, admin training session.
- Optional hardening candidates: notifications, correction-flow for issued certs, Dashboards V2 (all P1 in PRD).

---

## Milestone Summary

| Gate | Scope | Due (from kickoff) |
|---|---|---|
| 0 | Contract + scaffolding | End Wk 1 |
| 1 | Login + foundation on staging (docker) | End Wk 4 |
| 2 | Core module APIs + desktop module screens | End Wk 8 |
| 3 | Parsing + AI fallback pipeline | End Wk 10 |
| 4 | Desktop UI complete + UAT env | End Wk 12 |
| 5 | Tauri desktop packaging + installers | End Wk 15 |
| 6 | QA/UAT complete → **GO-LIVE** | End Wk 17 |
| — | Warranty + handover | Wk 18–20 |

## Timeline Visual

```
Wk: 1---2---3---4---5---6---7---8---9---10---11---12---13---14---15---16---17
P0  ██
P1  └────██────██────██
P2              └────────██──────██──────██
P3                        └────────██──────██──────██
P4                                ██──────██──────██
P5                                        └────────██────────██────────██
P6                                            └──────────────██──────██──────██
Gate:  G0      G1              G2      G3      G4              G5              G6
```

---

## Risks to the Timeline

- **Report corpus availability**: parser + AI tuning depends on the client providing ≥50 real report samples by **Week 6**. Without them, Gate 3 slips (AI is the only plausible slip source).
- **VPS AI performance**: if the 2vCPU/4GB node can't meet latency, the AI node upgrade (client-funded per PRD §8) must land by **Week 8**.
- **Offline scope removed**: no offline mode exists; the app requires internet to the VPS API by design (PRD §3/§10).
- **Scope changes**: any web/SaaS/mobile/ERP ask moves milestones by change-control, not in-flight.

*End of timeline. Base assumptions: 4 devs, agreed UX, single-tenant, VPS + client-funded AI capacity.*