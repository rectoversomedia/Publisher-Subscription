# Tempo Reader Revenue Brain — Red Team Technical Audit

**Date:** 2026-08-26
**Auditor:** Claude Code (Adversarial Enterprise Product Review)
**Scope:** Phases 5–9: Data Requirements, Failure Modes, Performance, Security/Privacy, CDP vs Revenue Brain Architecture

---

## Minimum Pilot Data Requirements

The minimum viable event schema for a shadow mode pilot:

| Field | Location | Classification | Rationale |
|-------|----------|----------------|-----------|
| `session_id` | Event ingestion | **REQUIRED** | Core join key; every event must have one. No session_id = event is orphaned. |
| `event` | Event ingestion | **REQUIRED** | The event name drives all downstream scoring and decision logic. |
| `reader_id` OR `anonymous_id` | Event ingestion | **REQUIRED** | One is needed to resolve or create a reader record. Anonymous readers are supported via `anonymous_id` lookup. |
| `timestamp` | Event ingestion | **RECOMMENDED** | Defaults to server receipt time; acceptable for a pilot but loses event-order fidelity. |
| `event_id` | Event ingestion | **OPTIONAL** | Auto-generated server-side. Only needed if the client needs idempotency guarantees before the round-trip. |
| `properties.article_id` | Event ingestion | **RECOMMENDED** | Needed for article-level features (premium content scoring, topic affinity). Without it, article-level features return zero. |
| `properties.source` | Event ingestion | **OPTIONAL** | Defaults to "web". Only needed for multi-channel attribution. |

### Shadow Mode Decision Endpoint Minimums

| Field | Location | Classification | Rationale |
|-------|----------|----------------|-----------|
| `reader_id` | Decision request | **REQUIRED** | Primary key for reader lookup. If unknown, the reader must already exist in `readers` table. |
| `context.session_id` | Decision request | **REQUIRED** | Passed to the rule engine; used in decision audit trail. |
| `context.article_id` | Decision request | **OPTIONAL** | Needed only for article-aware decisions or topic affinity scoring. |
| Pre-existing `reader_features` row | DB | **RECOMMENDED** | If absent, the system falls back to `ALLOW_FREE` with confidence 0.5. Works for new readers, but scoring-driven rules (propensity thresholds, churn risk) will never fire. |

### Minimum Viable Pilot Schema (literal)

```json
// POST /api/v1/events
{ "session_id": "sess_abc123", "event": "article_view", "anonymous_id": "anon_xyz" }

// POST /api/v1/decision
{ "reader_id": "rec_xxx", "context": { "session_id": "sess_abc123" } }
```

The pilot can run shadow mode with these four fields. All scoring, propensity, and decision rules still fire — new readers without features get `ALLOW_FREE` (safe), known readers get full scoring.

---

## Failure Mode Analysis

| # | Scenario | Current Behavior | Safe? | Fix Needed |
|---|----------|-----------------|-------|-----------|
| F1 | Database unavailable | Event ingestion: `Promise.allSettled` swallows errors, returns `{accepted: N, failed: M}` with status 207 — partial success. Decision API: unhandled exception → 500 "Internal server error". Dashboard: `catch` block falls through to `MOCK_*` data and returns status 200 with `_demo: true`. | **Partially safe** (Dashboard OK; Decision API not safe — callers get 500 with no usable body for shadow-mode fallback) | Add try/catch with fallback response to Decision API; return `{action: "ALLOW_FREE", confidence: 0.1, reason_codes: ["SYSTEM_UNAVAILABLE"]}` instead of 500. |
| F2 | Decision API timeout | No explicit timeout on `supabaseAdmin` calls. Supabase REST calls in `readers/[id]` also have no timeout. A slow DB query will hang indefinitely. | **NOT safe** | Add `{ signal: AbortSignal.timeout(ms) }` to all `supabaseAdmin` calls and all `fetch` calls. Use 3000ms for decision path, 5000ms for reader detail. |
| F3 | Malformed event payload | Zod schema validates all events. Invalid fields return 400 with `parsed.error.issues`. Single-event and batch both validated. | **Safe** | None — validation is correct. |
| F4 | Duplicate event (same `event_id`) | Deduplication exists: checks `events` table for existing `event_id`. Returns early if found. | **Safe** | None. However: deduplication is best-effort only — a race between two identical `event_id` submissions within the same query window could result in double-insert. Low risk in practice. |
| F5 | Unknown `reader_id` in decision request | Decision API returns 404 `{error: "Reader not found"}`. No reader is created. | **Safe** | None. Behavior is correct — an unknown ID means the reader hasn't been seeded. Caller should check before calling Decision API. |
| F6 | Missing `subscription_status` in reader record | `subscription_status` defaults to `'NONE'` from DB schema. Decision rules treat `'NONE'` as non-subscriber, which is correct behavior. | **Safe** | None. Schema default handles this correctly. |
| F7 | No eligible offer in DB | `selectBestOffer()` returns `null`. Decision returns the matched action (e.g., `SHOW_ANNUAL`) with `offer: null`. Downstream UI needs to handle null offer gracefully. | **Safe** | None — the action itself is still returned. Ensure frontend has a null-guard for `offer.price` display. |
| F8 | High event volume (no rate limiting) | No rate limiting exists on any endpoint. A single client can POST unlimited events. High volume exhausts DB write capacity, slows all feature recalculations, and triggers Supabase plan limits. | **NOT safe** | Add rate limiting: per-IP token bucket on `/api/v1/events` (e.g., 1000 events/minute per IP) and per-reader request limits on `/api/v1/decision`. Use `@upstash/ratelimit` or Vercel Edge Config. |
| F9 | Config mutation by unauthorized party | `/api/config` PUT has no authentication. Anyone can change `execution_mode`, `traffic_rollout`, feature flags, or thresholds. | **NOT safe** | Add API key validation or Next.js middleware to verify a secret header on all config write operations. |
| F10 | Experiment variant creation fails | Partial rollback on variant insert failure — deletes the already-created experiment. Good. | **Safe** | None. |
| F11 | `sbRpc` with arbitrary SQL | `readers/[id]/route.ts` exposes a `sbRpc` function (never called in the route itself — dead code). `sbInsert` has no SQL injection risk since it uses `JSON.stringify` on a typed object. | **Potentially unsafe** | The `sbRpc` function (lines 23-35) is dead code but still in the file. If called with unsanitized `p_sql`, it would execute arbitrary SQL. Remove or guard with a comment blocking its use. |
| F12 | Events API returns 207 (partial success) | `Promise.allSettled` means some events may have failed silently. Caller gets `accepted/failed` counts. | **Safe with caveats** | Clients need to check `failed > 0` and log/alert on it. The 207 status is non-standard for many HTTP clients — some treat any non-2xx as an error. |

---

## Performance Issues

| # | Issue | Location | Severity | Fix |
|---|-------|---------|----------|-----|
| P1 | **N+1 in experiment enrichment** | `/api/v1/experiments` GET | HIGH | Each running experiment calls `calculateExperimentResults(exp.id)` sequentially in a `Promise.all`. With N running experiments, this fires N parallel DB queries. For N > 10, this can saturate connection pool. Replace with a single batch query that computes all experiment results in one round-trip. |
| P2 | **Sequential fetches in reader detail** | `/api/v1/readers/[id]` | HIGH | 5 sequential `sbQuery` calls (reader, features, topic_affinity, decisions, events, assignments) could be batched into 1–2 parallel requests using Supabase PostgREST `$select` with joins or parallel fetches. Currently each `sbQuery` fires its own HTTP request. |
| P3 | **In-memory filtering for propensity range** | `/api/v1/readers` | MEDIUM | `propensityMin`/`propensityMax` params fetch all 50-100 readers from DB then filter in JS. For large datasets this is wasteful. Use a Supabase range filter or create a composite index `(subscription_propensity)` and switch to `gte/lte` query params. |
| P4 | **Full 30-day events scan for feature recalculation** | `recalculateReaderFeatures` in events route | HIGH | Fetches ALL 30 days of events into memory, then runs `filter()` loops in JS. For high-engagement readers (e.g., 500 events), this is expensive. Replace with DB-level aggregation queries: `COUNT(*) FILTER (WHERE event_name = 'article_view')`, `COUNT(DISTINCT session_id) FILTER (WHERE ...)`, etc. |
| P5 | **Missing `premiumArticles` query on every feature recalc** | `recalculateReaderFeatures` | MEDIUM | Fetches the full `articles` table filtered by `is_premium = true` on every event for every reader. With thousands of articles this gets expensive. Cache the premium article IDs in memory for the duration of a batch, or maintain a materialized `premium_article_ids` config row. |
| P6 | **No query timeout on Supabase client** | All Supabase calls | MEDIUM | The `supabaseAdmin` client has no default timeout. Long-running queries block the API worker. Add `{ statements: [{ timeout: 3000 }] }` or equivalent pool config. |
| P7 | **No database indexes declared** | Audit note | MEDIUM | No `migrations/` directory found. Expected indexes: `(reader_id, timestamp)` on `events`, `(reader_id)` on `reader_features`, `(subscription_status)` on `readers`, `(propensity)` range index for filtering. Missing indexes cause full table scans on growing data. |
| P8 | **Dashboard fetches 6 queries in parallel, each with 8-12s timeout** | `/api/dashboard` | LOW | The parallel fetch with per-query timeouts is architecturally sound. The fallback to `MOCK_*` data after timeout is good. No change needed. |

### Priority Fix Sequence

1. Add DB indexes before pilot load testing — this affects everything
2. Replace in-memory feature aggregation with SQL aggregation queries (P4)
3. Batch experiment results into single query (P1)
4. Parallelize reader detail fetches (P2)
5. Add query timeouts to all Supabase calls (P6)

---

## Security / Privacy Issues

| # | Issue | Location | Severity | Detail |
|---|-------|---------|----------|--------|
| S1 | **No authentication on any API route** | All routes | **CRITICAL** | Every API endpoint is unauthenticated. Any party with the deployment URL can read all readers, write all events, mutate config, and create experiments. This is the single most blocking issue for production. |
| S2 | **No authentication on `/api/config` PUT** | `/api/config` | **CRITICAL** | Unauthenticated anyone can change `execution_mode` to `SHADOW` (disabling all revenue decisions), set `traffic_rollout` to 0, or flip any feature flag. No API key, no bearer token, no middleware check. |
| S3 | **PII fields returned in reader list API** | `/api/v1/readers` | **HIGH** | `GET /api/v1/readers` returns full reader objects including `anonymous_id`, `external_user_id`, and `email_hash`. The frontend filters to display only truncated IDs, but the raw API response contains full PII. Any caller of this endpoint (mobile app, third-party integration) gets all PII fields. |
| S4 | **PII fields returned in reader detail API** | `/api/v1/readers/[id]` | **HIGH** | Returns all reader fields including `anonymous_id`, `external_user_id`, `email_hash`. These should be stripped from API responses unless the caller is authenticated as an admin. |
| S5 | **PII fields returned in decisions list API** | `/api/v1/decisions` | **HIGH** | Join includes `anonymous_id` and `external_user_id` from the `readers` table. Decision logs often need to be accessible to support staff, but anonymized — not with full ID exposure. |
| S6 | **No schema validation on config PUT body** | `/api/config` | **HIGH** | The PUT handler accepts `{"key": "...", "value": ...}` without validating `value` type. A bad value (e.g., `value: "SHADOW"` for `execution_mode` string, or a string for a numeric threshold) is accepted silently and may corrupt system behavior. |
| S7 | **Dead `sbRpc` function with arbitrary SQL potential** | `/api/v1/readers/[id]` lines 23-35 | **HIGH** | A `sbRpc` function that executes arbitrary SQL via `exec_sql` RPC is present in the file. Even if not called, this is a supply-chain risk — if any future code path calls it, arbitrary SQL executes with service role privileges. This function should be removed. |
| S8 | **No rate limiting anywhere** | All routes | **HIGH** | No `@upstash/ratelimit`, no Vercel Edge rate limiting, no per-IP limits. An attacker or buggy client can exhaust Supabase write quota and cause service degradation. |
| S9 | **`sbInsert` silently ignores non-OK responses** | `/api/v1/experiments` line 34 | **MEDIUM** | `sbInsert` returns `res` (the Response object) without checking `res.ok`. Callers handle it correctly, but the helper is unsafe by design. A future caller who forgets to check will get silent failures. |
| S10 | **`MOCK_KPIS` reveals business metrics in client bundle** | `/api/dashboard` | **MEDIUM** | `MOCK_KPIS` contains specific revenue figures (e.g., `reader_revenue: 489200000`). These are hardcoded in the server-side route and returned to any caller without authentication. Not PII, but business-sensitive. |
| S11 | **No CORS configuration** | All routes | **LOW** | No explicit CORS headers. Defaults to Next.js `same-origin` policy, which is appropriate if all calls are from the same origin. If the event ingestion SDK is called from browser clients, CORS must be configured. |
| S12 | **`processEvent` recalculates features synchronously** | `/api/v1/events` | **LOW** | After inserting an event, `recalculateReaderFeatures` runs synchronously before returning. For batch ingestion, this can cause long tail latencies. This is not a security issue but a reliability issue. |
| S13 | **No SQL injection in Supabase JS client routes** | All supabaseAdmin routes | **LOW** | All Supabase JS client calls use parameterized queries. No raw SQL concatenation. The direct REST routes use `encodeURIComponent` on IDs, which is safe for URL path values. |
| S14 | **Error messages are sanitized** | All routes | **LOW** | All catch blocks return `{error: "Internal server error"}` without stack traces. This is correct. The `console.error` for internal logging is fine. |
| S15 | **No XSS risk in error messages** | All routes | **LOW** | Error responses contain only fixed strings, not user-supplied input interpolated into error messages. No XSS vector found. |

### Security Fix Priority

1. **S1, S2**: Add API key authentication via Next.js middleware before anything ships
2. **S3, S4, S5**: Strip PII fields from all list/detail responses or add row-level security in Supabase
3. **S7**: Remove the `sbRpc` function entirely
4. **S8**: Add rate limiting on event ingestion and decision endpoints
5. **S6**: Add Zod schema validation for config value types

---

## CDP vs Revenue Brain Architecture

### Findings

**The distinction is NOT clearly articulated in the product.**

The product functional audit (docs/product-functional-audit.md) correctly lists all pages and routes, but no documentation explicitly defines what Revenue Brain is NOT. No `ARCHITECTURE.md`, `README.md`, or product positioning document was found that draws the CDP boundary.

### What the UI Gets Right

- Page names use revenue-specific language: "Reader Explorer," "Decision Log," "Revenue Attribution," "Revenue Opportunity Radar"
- Dashboard subtitle: "Tempo Reader Revenue Brain — Incremental revenue intelligence"
- Decision Log labels decisions by revenue action (`SHOW_ANNUAL`, `SHOW_WINBACK`), not by audience segment
- The "Top Revenue Segments" panel names segments by conversion strategy ("High Intent Non-Subscribers") rather than demographic labels

### What the UI Gets Wrong or Ambiguous

| # | Finding | Risk |
|---|---------|------|
| A1 | **No product-level "What is Revenue Brain?" page** | Buyers have no canonical reference. Without this, every sales call starts from scratch explaining the scope. |
| A2 | **"Opportunities" page is named like a campaign platform** | "Revenue Opportunity Radar" uses the word "opportunity" in a way that maps to CDP use cases (audience segments → campaign opportunities). This is the most ambiguous page name. A buyer from a marketing platform background could mistake this for campaign management. |
| A3 | **"News Moments" page has no explanation of its scope** | "News Moment Intelligence" could be mistaken for a social listening or brand monitoring feature (CDP adjacent). No label clarifies this is a demand-signal input to the decision engine, not a standalone intelligence product. |
| A4 | **No "Revenue Decisioning vs CDP" comparison** | The `/api/v1/decision` endpoint's purpose is clear to engineers, but a business buyer reading the API docs would not understand why this is different from a CDP's "next best action" feature. |
| A5 | **"Reader Explorer" could imply a CDP identity graph** | The reader list shows identity_status, anonymous_id, external_user_id — the type of data a CDP would manage. Without a clear scope label, a buyer could conclude this is a lightweight identity resolution tool (CDP territory). |
| A6 | **No differentiation from " Audience Targeting" in experiments** | "Audience Definition" in the experiment schema (with `propensity_min`, `identity_status`, `topics`) could be confused with campaign audience builder features in a CDP or marketing cloud. |

### Recommended Explicit Distinctions to Add

The following distinctions should be made explicit in the UI and documentation:

| Revenue Brain Concept | CDP Equivalent | Revenue Brain Positioning |
|----------------------|----------------|--------------------------|
| Reader Revenue Intelligence | Customer Data Platform | Tracks behavioral signals relevant to subscription conversion — not full identity/profiles |
| Subscription Propensity Score | Customer Segmentation | Scores are action-oriented (conversion probability) not descriptive (segments) |
| Revenue Decisioning | Customer Activation | Decisions are real-time treatment selection, not campaign orchestration |
| Treatment Selection | Audience Targeting | Targets individual readers at session time, not audience cohorts for campaigns |
| Offer Optimization | Campaign Management | Optimizes offer selection per reader, not campaign-level budget allocation |
| Revenue Attribution | Multi-touch Attribution | Attributes revenue to Revenue Brain decisions, not to marketing channels |

### Recommended UI Changes

1. Add a landing banner or tooltip on the "Opportunities" page explaining: *"Revenue opportunities are reader cohorts detected by the system for manual investigation. This is not a campaign launch platform — use your marketing cloud for campaign execution."*
2. Rename "Revenue Opportunity Radar" to "Revenue Signals" or "Revenue Intelligence Alerts" to reduce CDP association
3. Add a `?context=what-is-this` help panel to "News Moments" explaining it is a demand-signal input, not a media monitoring tool
4. Add a product-level `/dashboard/about` or `?info=scope` panel with the 5-row "Revenue Brain is NOT a CDP" comparison
5. Strip `anonymous_id` and `external_user_id` from the reader list table in the UI (they are shown truncated, which is correct, but the page should clarify these are internal identifiers, not exposed PII)

---

*End of Red Team Technical Audit — Phases 5–9*
