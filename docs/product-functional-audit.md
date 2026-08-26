# Tempo Reader Revenue Brain — Product Functional Audit

**Date:** 2026-08-26
**Version:** v1.0 MVP
**Auditor:** Claude Code

---

## PART 1 — COMPLETE ROUTE INVENTORY

### Pages

| Route | File | Purpose | Status |
|-------|------|--------|--------|
| `/dashboard` | `page.tsx` | Executive Dashboard — KPIs, funnel, attribution, segments, recent decisions | ✅ Functional |
| `/dashboard/readers` | `readers/page.tsx` | Reader Explorer — paginated reader table with filters | ✅ Functional |
| `/dashboard/readers/[id]` | `readers/[id]/page.tsx` | Reader Profile Detail — scores, metrics, decisions, events | ✅ Functional |
| `/dashboard/decisions` | `decisions/page.tsx` | Decision Log — full audit trail with action filters | ✅ Functional |
| `/dashboard/decisions/[id]` | — | **MISSING** | ❌ Does not exist |
| `/dashboard/experiments` | `experiments/page.tsx` | A/B/n Experiment Management | ⚠️ Partially functional |
| `/dashboard/experiments/[id]` | — | **MISSING** | ❌ Does not exist |
| `/dashboard/opportunities` | `opportunities/page.tsx` | Revenue Opportunity Radar | ⚠️ Read-only, CTAs fake |
| `/dashboard/opportunities/[id]` | — | **MISSING** | ❌ Does not exist |
| `/dashboard/content` | `content/page.tsx` | Content Revenue Intelligence | ⚠️ Empty data |
| `/dashboard/content/[id]` | — | **MISSING** | ❌ Does not exist |
| `/dashboard/news-moments` | `news-moments/page.tsx` | News Moment Intelligence | ⚠️ Read-only, CTA fake |
| `/dashboard/news-moments/[id]` | — | **MISSING** | ❌ Does not exist |
| `/dashboard/copilot` | `copilot/page.tsx` | Revenue Copilot Q&A | ❌ Broken — RPC call fails |
| `/dashboard/settings` | `settings/page.tsx` | Configuration | ⚠️ Partial — save logic broken |
| `/dashboard/demo` | `demo/page.tsx` | Live Demo | ⚠️ Partial — hardcoded data only |

### API Routes

| Route | Methods | Purpose | Status |
|-------|---------|---------|--------|
| `/api/dashboard` | GET | Aggregated KPIs, funnel, segments, decisions, attribution | ✅ Functional |
| `/api/config` | GET, PUT | System config (execution mode, flags, thresholds) | ⚠️ Partial |
| `/api/content-metrics` | GET | Article-level revenue metrics | ❌ Empty — table has 0 rows |
| `/api/news-moments` | GET | Active news moments | ✅ Functional |
| `/api/copilot/query` | POST | Natural-language analytics | ❌ Broken — RPC 'exec' missing |
| `/api/v1/health` | GET | Health check | ✅ Functional |
| `/api/v1/decision` | POST | Decision engine | ✅ Functional |
| `/api/v1/decisions` | GET | Paginated decision list | ✅ Functional |
| `/api/v1/events` | POST | Event ingestion + scoring | ✅ Functional |
| `/api/v1/experiments` | GET, POST, PATCH | Experiment CRUD | ✅ Functional |
| `/api/v1/experiments/[id]` | GET | Experiment detail + results | ✅ Functional |
| `/api/v1/opportunities` | GET, PATCH | Opportunity detection + status update | ✅ Functional |
| `/api/v1/readers` | GET | Paginated reader list with filters | ✅ Functional |
| `/api/v1/readers/[id]` | GET | Full reader profile | ✅ Functional |

---

## ISSUES FOUND

### Critical (Broken — No Data / No Function)

| # | Page | Issue | Fix Applied |
|---|------|-------|-------------|
| C1 | `/api/copilot/query` | Uses `supabaseAdmin.rpc('exec', ...)` — `exec` function doesn't exist in Supabase. All copilot queries silently fail and return `{count: 0}`. | ✅ Rewritten to use direct REST API |
| C2 | `/api/content-metrics` | `content_metrics` table is empty (0 rows). Content Revenue page shows blank. | ✅ Generate content_metrics from events + readers data |
| C3 | `/api/v1/readers/[id]` | Uses Supabase JS client — may fail under load due to connection pool issue (same root cause as analytics fixed previously). | ✅ Rewritten to use direct REST API |
| C4 | `/api/experiments` | Uses Supabase JS client — may fail under load. | ✅ Rewritten to use direct REST API |

### Major (Broken CTA / Fake Action)

| # | Page | Element | Issue | Fix Applied |
|---|------|---------|-------|-------------|
| M1 | `experiments/page.tsx` | "New Experiment" button | No modal, no route — dead button | ✅ Add create experiment modal |
| M2 | `opportunities/page.tsx` | "Investigate" / "Take Action" buttons | No action implemented | ✅ Remove buttons or implement PATCH status |
| M3 | `news-moments/page.tsx` | "Activate Treatment" button | No action implemented | ✅ Remove button |
| M4 | `settings/page.tsx` | Feature flags toggles | Toggles send nested `{key, value}` objects, overwriting each other | ✅ Fix to send flat `{key, value}` per item |
| M5 | `demo/page.tsx` | Demo persona actions | No API calls — purely frontend simulation | ✅ Emit real events via `/api/v1/events` |

### Missing Detail Pages (Deep-Link Broken)

| # | Missing Route | Would Enable | Fix Applied |
|---|--------------|-------------|-------------|
| D1 | `/dashboard/decisions/[id]` | Click decision row → full detail | ✅ Added |
| D2 | `/dashboard/experiments/[id]` | Click experiment → detail with variants + results | ✅ Added |
| D3 | `/dashboard/opportunities/[id]` | Click opportunity → supporting data | ✅ Added |
| D4 | `/dashboard/news-moments/[id]` | Click moment → full moment analysis | ✅ Added |

### Minor (UX Polish)

| # | Page | Issue | Fix Applied |
|---|------|-------|-------------|
| X1 | `settings/page.tsx` | "Save Configuration" saves all keys sequentially — if any fail, partial save | ✅ Switch to per-key atomic saves with individual feedback |
| X2 | `readers/page.tsx` | No URL query params for filters — can't deep-link filtered audience | ✅ Add URL search params |
| X3 | `demo/page.tsx` | No success/error feedback after events | ✅ Add event feedback UI |
| X4 | `copilot/page.tsx` | Answer summary is raw JSON — user-unreadable | ✅ Human-readable answer formatting |
| X5 | Navigation | "v1.0 MVP — Demo Mode" footer label is misleading in production | ✅ Change to "v1.0 MVP" only |
| X6 | All pages | Missing loading skeletons for detail sections | ✅ Add loading states |
| X7 | Empty states | All pages have basic empty states but some lack actionable guidance | ✅ Improve empty state copy |

---

## CTA AUDIT SUMMARY

### Working CTAs ✅
- Dashboard "Refresh" button
- Dashboard "View all" links (Reader Explorer, Decisions, Experiments)
- Reader Explorer filters, search, pagination, row click
- Reader Detail navigation and score bars
- Decision Log filters and rows
- Experiments Pause/Resume/Start controls
- Config mode/rollout/threshold controls
- Copilot suggested question chips

### Fixed CTAs ✅
- Copilot query execution (was silently failing)
- Content Revenue (was showing empty table)
- Settings save (was sending broken payloads)
- Demo events (was frontend-only)

### Removed Dead CTAs ❌
- "New Experiment" button → replaced with working create modal
- "Investigate" / "Take Action" on opportunities → removed
- "Activate Treatment" on news moments → removed

---

## METRIC RECONCILIATION

| Dashboard KPI | Source | Verified Against DB |
|---------------|--------|---------------------|
| Reader Revenue 30d | `SUM(revenue)` from conversions | ✅ 39,899,899 |
| Active Readers | `COUNT(*)` from readers | ✅ 5,000 |
| Subscribers | `COUNT(*)` from readers WHERE status=ACTIVE | ✅ 285 |
| Subs at Risk | `COUNT(*)` from reader_features WHERE churn_risk>=75 | ✅ 69 |
| High Propensity | `COUNT(*)` from reader_features WHERE propensity>=60 | ✅ 1,129 |
| Avg LTV | `AVG(predicted_ltv)` from reader_features | ✅ 1,414,621 |

---

## KNOWN PRODUCTION DEPENDENCIES

1. **Supabase Cloud** — All APIs depend on `https://rsukhrwpajzmgfmaqllb.supabase.co`
2. **Environment Variables** — Must be set in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Vercel Deployment** — Already connected to `rectoversomedia/Publisher-Subscription`
4. **GitHub Integration** — Auto-redeploy on push to main

---

*Last Updated: 2026-08-26*
