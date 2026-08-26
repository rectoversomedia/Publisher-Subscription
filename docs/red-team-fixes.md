# Red Team Audit — Tempo Reader Revenue Brain

**Audit Date:** 2026-08-26
**Auditor:** Red Team / Adversarial Product Review
**Scope:** Dashboard, Decision Engine, Scoring Models, Analytics Attribution

---

## Phase 1: Demo Magic Findings

### Summary Table

| # | Finding | Location | Type | Severity |
|---|---------|----------|------|----------|
| D1 | Entire dashboard silently falls back to hardcoded mock data | `src/app/api/dashboard/route.ts` | [FAKE] | CRITICAL |
| D2 | `unique_readers` funnel counts raw event rows, not unique readers | `src/analytics/index.ts` `getSubscriptionFunnel()` | [FAKE] | CRITICAL |
| D3 | Segment conversion rates are hardcoded, not measured | `src/analytics/index.ts` `getReaderSegments()` | [FAKE] | HIGH |
| D4 | `revenue_opportunity` applies a phantom 3% conversion rate | `src/analytics/index.ts` `getDashboardKPIs()` | [LABEL] | HIGH |
| D5 | Segment `estimated_revenue` multiplies hardcoded rates × assumed LTV | `src/analytics/index.ts` `getReaderSegments()` | [FAKE] | HIGH |
| D6 | Opportunity revenue estimates use unverifiable fixed constants | `src/analytics/opportunities.ts` | [LABEL] | HIGH |
| D7 | `new_readers` in news moments is hardcoded to zero | `src/analytics/news-moments.ts` | [FAKE] | MEDIUM |
| D8 | Supabase RPC `exec_sql` may not exist — silent failure path | `src/analytics/opportunities.ts` `sbRpc()` | [FAKE] | HIGH |
| D9 | `_demo: true` exposed in API but never checked by the UI | `src/app/dashboard/page.tsx` | [FAKE] | MEDIUM |
| D10 | `avg_ltv` filters out zero-LTV rows, biased upward | `src/analytics/index.ts` `getDashboardKPIs()` | [FAKE] | MEDIUM |
| D11 | `active_readers_30d` = total readers in DB, not 30-day active | `src/analytics/index.ts` `getDashboardKPIs()` | [FAKE] | HIGH |
| D12 | `revenue_per_1000_readers` denominator includes all historical readers | `src/analytics/index.ts` `getDashboardKPIs()` | [FAKE] | HIGH |

---

### D1 — CRITICAL: Silent Mock Data Fallback

**File:** `src/app/api/dashboard/route.ts`

The dashboard API silently substitutes entire hardcoded datasets when the database is unavailable or any query times out:

```typescript
const MOCK_KPIS = {
  reader_revenue: 489200000,
  subscription_conversion: 0.031,
  revenue_per_1000_readers: 12400,
  revenue_opportunity: 312000000000,  // Rp 312 billion — fabricated
  avg_ltv: 284000,
  // ...
};
```

On line 77, `const usingMock = kpis === null;` — the flag is set but never transmitted to the UI in a way the frontend checks. The response includes `_demo: true`, but `DashboardPage` never reads it.

**Fix:** The UI should display a prominent banner reading "DEMO MODE — Showing simulated data" any time `_demo: true` is present. At minimum, add `data._demo` to the component state and render a dismissible warning banner.

---

### D2 — CRITICAL: Funnel `unique_readers` Counts Events, Not People

**File:** `src/analytics/index.ts`, line 101:

```typescript
sbCount('events', `timestamp=gte.${thirtyDaysAgo}`),
```

This counts every event row in the `events` table. One anonymous reader who views 50 articles over 30 days contributes 50 to `unique_readers`. The entire funnel — paywall exposed, offer clicks, checkout starts, subscriptions — is built on this denominator, making all derived conversion rates meaningless.

**Fix:** Either query `SELECT COUNT(DISTINCT reader_id) FROM events WHERE ...` via an RPC, or add a `readers` table column for last-30-day visit tracking and count distinct reader IDs.

---

### D3 — HIGH: Segment Conversion Rates Are Assumed, Not Measured

**File:** `src/analytics/index.ts`, lines 134, 153, 162:

```typescript
{ conversion_rate: 0.023, ... },  // High Intent Non-Subscribers — 2.3%
{ conversion_rate: 0.035, ... },  // Investigative Loyalists — 3.5%
{ conversion_rate: 0.012, ... },  // Registered Non-Subscribers — 1.2%
```

These are entered as constants with no derivation. The application has a `conversions` table and a `decisions` table — actual conversion rates can be computed per segment by joining decisions to conversions.

**Fix:** Query historical conversion rates from the `conversions` table, bucketed by segment membership. Fall back to a conservative heuristic only when insufficient history exists, and label it explicitly.

---

### D4 — HIGH: `revenue_opportunity` Uses a 3% Phantom Conversion Rate

**File:** `src/analytics/opportunities.ts`, line 72:

```typescript
estimated_incremental_revenue: hpCount * 290000 * 0.03,
```

And in `src/analytics/index.ts`, line 137:

```typescript
estimated_revenue: hiRows.length * 0.023 * 290000,
```

`0.03` (3%) is nowhere documented as a measured conversion rate. `290000` (Rp 290,000) is an assumed LTV. The product of the three is presented as "estimated revenue" with no uncertainty range or methodology note.

**Fix:** Pull the actual measured conversion rate from historical data for the high-propensity cohort. If insufficient data, use a lower confidence bound and label it HEURISTIC ESTIMATE.

---

### D5 — HIGH: Segment `estimated_revenue` Multiplies Hardcoded Rates by Assumed LTV

**File:** `src/analytics/index.ts`, lines 137, 155, 164:

```typescript
estimated_revenue: hiRows.length * 0.023 * 290000,  // hardcoded rate × hardcoded LTV
estimated_revenue: invLoyCount * 0.035 * 350000,    // hardcoded rate × hardcoded LTV
estimated_revenue: regNonSubCount * 0.012 * 120000, // hardcoded rate × hardcoded LTV
```

Same issue as D4 — fabricated multipliers. "Investigative Loyalists" uses `avg_ltv: 350000` even though the actual `invLoyCount` readers' LTVs are not fetched.

**Fix:** Calculate segment LTV from actual `predicted_ltv` values in `reader_features`. Calculate conversion rates from the `conversions` table.

---

### D6 — HIGH: Opportunity Revenue Estimates Use Unverifiable Constants

**File:** `src/analytics/opportunities.ts`

| Line | Calculation | Constant Used |
|------|-------------|---------------|
| 72 | `hpCount * 290000 * 0.03` | 3% conversion, Rp 290K LTV |
| 94 | `revenueAtRisk * 0.3` | 30% assumed retention if saved |
| 123 | `abandons * 150000 * 0.15` | Rp 150K conversion × 15% prob |

None of these constants are derived from Tempo's actual data. The 30% retention assumption for "at-risk" subscribers is particularly speculative — it assumes every third at-risk subscriber saved generates one additional year of subscription.

**Fix:** Use actual measured conversion rates per opportunity type. If unavailable, add a confidence interval and label these ESTIMATED values clearly in the UI.

---

### D7 — MEDIUM: `new_readers` in News Moments Is Always Zero

**File:** `src/analytics/news-moments.ts`, line 117:

```typescript
new_readers: 0,  // never computed — always zero
```

The `new_readers` field is present in the UI at `news-moments/page.tsx` line 94, but the detection function never populates it.

**Fix:** Compare reader IDs in the recent window against `first_seen_at` timestamps from the `readers` table to identify genuinely new readers per topic.

---

### D8 — HIGH: Supabase RPC `exec_sql` May Not Exist

**File:** `src/analytics/opportunities.ts`, lines 8–19:

```typescript
async function sbRpc(sql: string) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/exec_sql`, {
    // ...
  });
  return res.json();
}
```

`exec_sql` is a custom RPC function that must be manually created in Supabase. It is never called in the current code (the opportunities detection uses direct table queries instead), so it is dead code — but its presence indicates the system was designed to bypass Supabase's query engine, which is a security risk if enabled.

**Fix:** Remove `sbRpc` entirely. If dynamic SQL is needed, require a proper stored procedure with parameterized queries instead of raw SQL execution.

---

### D9 — MEDIUM: `_demo` Flag Exists But UI Never Checks It

**File:** `src/app/api/dashboard/route.ts` line 87 and `src/app/dashboard/page.tsx`

The API response contains `_demo: true` when serving mock data, but `DashboardPage` never reads this field. A user running the app without Supabase sees convincing-looking numbers (Rp 489 million revenue, 847 high-propensity readers) with no indication the data is fabricated.

**Fix:** Add `_demo` to `DashboardData` interface and render a dismissible banner: "Database unavailable — showing simulated data."

---

### D10 — MEDIUM: `avg_ltv` Excludes Zero-LTV Rows

**File:** `src/analytics/index.ts`, lines 68–72:

```typescript
const nonZeroLtv = (ltvRows as Array<{predicted_ltv: number}>)
  .filter((r) => Number(r.predicted_ltv ?? 0) > 0);
const avgLtv = nonZeroLtv.length > 0
  ? nonZeroLtv.reduce((sum, r) => sum + Number(r.predicted_ltv ?? 0), 0) / nonZeroLtv.length
  : 0;
```

Filtering out zero-LTV rows systematically overstates average LTV. A subscriber who churned and has `predicted_ltv = 0` is excluded, biasing the average upward.

**Fix:** Include all rows and document that `avg_ltv` is the mean of `predicted_ltv` across all readers with a non-null score.

---

### D11 — HIGH: `active_readers_30d` Is Total Readers in Database

**File:** `src/analytics/index.ts`, line 50:

```typescript
sbCount('readers', ''),  // counts ALL rows — not filtered to 30 days
```

`active_readers_30d` is labeled "active readers in 30 days" but counts every row in the `readers` table, including readers who last visited two years ago. It should filter on `last_seen_at >= ${thirtyDaysAgo}`.

**Fix:** Change to `sbCount('readers', `last_seen_at=gte.${thirtyDaysAgo}`)`.

---

### D12 — HIGH: `revenue_per_1000_readers` Uses All-Time Reader Count

**File:** `src/analytics/index.ts`, line 65:

```typescript
const revenuePer1000 = totalReaders > 0 ? (totalRevenue30d / totalReaders) * 1000 : 0;
```

`totalReaders` (D11's bug) is all historical readers, not 30-day active readers. This makes `revenue_per_1000_readers` artificially low because the denominator includes millions of dormant readers who generated zero revenue.

**Fix:** Use the corrected 30-day active reader count as the denominator.

---

## Phase 2: Metric Traceability

### Dashboard KPI Classification

| KPI | Classification | Formula / Source | Issues |
|-----|---------------|------------------|--------|
| `total_revenue_30d` | MEASURED | `SUM(revenue)` from `conversions` table, 30-day window | OK — correctly summed from actual conversion records |
| `total_conversions_30d` | MEASURED | `COUNT(*)` from `conversions` table | OK |
| `subscription_conversion` | **HEURISTIC** | `active_subs / known_readers` | Active subscribers / known readers is not a conversion rate — known readers includes those subscribed before the window |
| `revenue_per_1000_readers` | **HEURISTIC** | `totalRevenue30d / totalReaders * 1000` | D11+D12: denominator is all-time readers, not 30-day active |
| `avg_ltv` | **ESTIMATED** | Mean of `predicted_ltv` where > 0 | D10: excludes zero-LTV rows, biased upward; `predicted_ltv` itself is a scoring model output |
| `high_propensity_audience` | MEASURED | `COUNT(*)` where `subscription_propensity >= 60` | OK as a count, but propensity is itself a scoring model output |
| `revenue_opportunity` | **HEURISTIC** | `hpCount * 290000 * 0.03` | D4: fabricated 3% rate and Rp 290K LTV |
| `subscribers_at_risk` | MEASURED | `COUNT(*)` where `churn_risk >= 75` | OK as a count; churn_risk is a scoring model output |
| `active_readers_30d` | **FAKE** | `COUNT(*)` all rows in `readers` table | D11: no date filter |
| `new_subscribers_30d` | **HEURISTIC** | `COUNT(*)` where `subscription_status=ACTIVE` AND `subscription_started_at` in window | Name implies new additions; counts current active subscribers who started in window — this is close but conflates reactivated with genuinely new |
| `known_readers` | MEASURED | `COUNT(*)` where `identity_status != ANONYMOUS` | OK |

### Funnel Classification

| Metric | Classification | Formula / Source | Issues |
|--------|---------------|------------------|--------|
| `unique_readers` | **FAKE** | `COUNT(*)` event rows | D2: counts events, not people |
| `known_readers` | MEASURED | `COUNT(DISTINCT)` readers where identity != ANONYMOUS | OK |
| `paywall_exposed` | MEASURED | `COUNT(*)` events with `event_name=paywall_view` | OK — relies on frontend firing event |
| `offer_clicks` | MEASURED | `COUNT(*)` events with `event_name=subscription_offer_click` | OK |
| `checkout_starts` | MEASURED | `COUNT(*)` events with `event_name=checkout_start` | OK |
| `subscriptions` | MEASURED | `COUNT(*)` from `conversions` table | OK |

### Revenue Attribution Classification

| Metric | Classification | Formula / Source | Issues |
|--------|---------------|------------------|--------|
| `direct_revenue` | MEASURED | Conversions with no `decision_id` and no `experiment_id` | OK — requires proper `decision_id` linkage on conversion |
| `experiment_revenue` | MEASURED | Conversions with `experiment_id` set | OK |
| `assisted_revenue` | **HEURISTIC** | Conversions with `decision_id` but no `experiment_id` | Relies on `decision_id` being populated at conversion time — fragile if conversion flow doesn't carry this |
| percentages | **ESTIMATED** | Ratio of measured revenues | OK as ratios if numerators are sound |

---

## Phase 3: Decision Engine Edge Case Analysis

### Rule Priority Map

| Priority | Rule ID | Trigger |
|----------|---------|---------|
| 1 | `active-subscriber-no-acquisition` | status = ACTIVE → NO_ACTION |
| 2 | `high-churn-retention` | status = ACTIVE AND churn_risk >= 75 → SHOW_SAVE_OFFER |
| 3 | `renewal-proximity` | status = ACTIVE AND churn_risk >= 60 AND sessions_7d < 2 → SHOW_RENEWAL |
| 4 | `winback-engaged` | status = EXPIRED/CANCELLED AND engagement > 60 → SHOW_WINBACK |
| 5 | `former-subscriber-high-propensity` | features.former_subscriber AND propensity >= 60 → SHOW_WINBACK |
| 10 | `low-propensity-allow` | propensity < 30 → ALLOW_FREE |
| 11 | `medium-low-propensity-newsletter` | propensity 30–45 AND ANONYMOUS → SHOW_NEWSLETTER_GATE |
| 20 | `medium-propensity-registration` | propensity 30–60 AND ANONYMOUS → SHOW_REGISTRATION |
| 30 | `high-propensity-high-price-sensitivity` | propensity 60–80 AND price_sensitivity >= 65 → SHOW_TRIAL |
| 31 | `high-propensity-low-price-sensitivity` | propensity 60–80 AND price_sensitivity < 65 → SHOW_MONTHLY |
| 32 | `checkout-abandon-retry` | propensity >= 60 AND checkout_starts_30d > 0 → SHOW_SAVE_OFFER **[DEAD CODE]** |
| 40 | `very-high-propensity-annual` | propensity >= 80 AND price_sensitivity < 40 → SHOW_ANNUAL |
| 41 | `very-high-propensity-annual-promo` | propensity >= 80 AND price_sensitivity 40–65 → SHOW_MONTHLY |
| 999 | `fallback-allow` | → ALLOW_FREE |

---

### Case 1: Anonymous, propensity 15, engagement 10, price_sensitivity 85

- Rule 10 (`low-propensity-allow`) matches: `propensity < 30` → **ALLOW_FREE**, confidence 0.9
- Reason codes: `LOW_SUBSCRIPTION_PROPENSITY`, `NEW_READER`
- **Assessment:** Correct. Anonymous low-propensity reader should not be pushed.
- Guardrails OK: No acquisition rule can fire for this profile.

---

### Case 2: Registered, propensity 78, engagement 72, price_sensitivity 68

- Propensity 78 falls in [60, 80) range.
- Rule 30: `propensity 60–80` AND `price_sensitivity >= 65` → **SHOW_TRIAL**, confidence 0.8
- Reason codes: `HIGH_SUBSCRIPTION_PROPENSITY`, `HIGH_PRICE_SENSITIVITY`
- **Assessment:** Correct for a high-propensity, price-sensitive registered reader. Trial reduces commitment barrier.
- Guardrails OK: No subscription status flags indicate this is a non-subscriber.

---

### Case 3: Registered, propensity 93, engagement 91, price_sensitivity 21, content_loyalty 88

- Propensity 93 >= 80 (very-high band).
- Rule 40: `propensity >= 80` AND `price_sensitivity < 40` → **SHOW_ANNUAL**, confidence 0.88
- Reason codes: `VERY_HIGH_SUBSCRIPTION_PROPENSITY`, `LOW_PRICE_SENSITIVITY`, `PREMIUM_CONTENT_LOYALTY`, `HIGH_ENGAGEMENT`
- **Assessment:** Correct. Very high propensity, very low price sensitivity, high engagement — annual is the right upsell.
- Guardrails OK.

---

### Case 4: Former subscriber, propensity 55, engagement 65, price_sensitivity 72

- `subscription_status` is not provided, but `features.former_subscriber = true`.
- Rule 5: `features.former_subscriber AND propensity >= 60` — **propensity is 55, below threshold**. Rule 5 does NOT fire.
- Falls through to Rule 10: `propensity < 30`? No — propensity is 55.
- Rule 11: `propensity >= 30 AND < 45`? No — propensity is 55.
- Rule 20: `propensity >= 30 AND < 60` AND `identity_status == ANONYMOUS`? **Not applicable if registered.**
- Rule 7/20 could fire if ANONYMOUS: `SHOW_REGISTRATION` at confidence 0.78.
- **Assessment:** A propensity-55 former subscriber who is registered gets NO specialized winback treatment. The `former_subscriber` flag only triggers Rule 5 at propensity >= 60. Below that, they are treated as a generic non-subscriber.
- **Guardrail issue:** The `former_subscriber` path (Rule 5) has a high propensity threshold that causes former subscribers with medium propensity to fall through to generic rules. This is arguably intentional but creates a gap.

---

### Case 5: Active subscriber, propensity 82, engagement 28, churn_risk 82

- Rule 1: `status = ACTIVE` → **NO_ACTION**, confidence 1.0. Guardrail fires immediately.
- Rule 2 never evaluated.
- **Assessment:** Correct. Active subscriber should not see acquisition offers. However: churn_risk = 82 AND engagement = 28 are strong churn signals, and Rule 2 (priority 2) would recommend `SHOW_SAVE_OFFER` if Rule 1 didn't short-circuit.
- **Guardrail concern:** Rule 1's `subscription_status = ACTIVE` check is based on the `readers.subscription_status` column. If this field is updated asynchronously or has lag, a subscriber who just cancelled might briefly show as ACTIVE and receive `NO_ACTION` instead of a winback offer.

---

### Edge Case A: Active subscriber with propensity 99

- Rule 1 fires first: `status = ACTIVE` → **NO_ACTION**.
- **Guardrail works correctly.** Acquisition offer is never shown.

---

### Edge Case B: No eligible offer available

- All rules evaluate normally.
- `selectBestOffer()` returns `null` (no matching offer in `offers` table).
- `expected_value` falls back to `selectedOffer.price * matchedRule.confidence` — which is `null * confidence = undefined`.
- Decision returns `offer: null` with the correct action.
- **No guardrail for this case.** A reader is told "SHOW_MONTHLY" but no monthly offer exists. The frontend must handle `offer === null` gracefully (it does — it just shows the action badge).
- **Concern:** The `expected_value` is `undefined` when no offer exists, making the confidence score non-comparable across decisions. The Decisions UI shows `—` for expected_value in this case.

---

### Edge Case C: Propensity 85 + Price Sensitivity 63

- Propensity 85 >= 80 (very-high band).
- Rule 40: `propensity >= 80 AND price_sensitivity < 40` — 63 >= 40 → **condition fails**.
- Rule 41: `propensity >= 80 AND price_sensitivity 40–65` — 63 is in range → **SHOW_MONTHLY**, confidence 0.82.
- **Assessment:** Correct. Rp 63/100 price sensitivity with very high propensity gets a monthly plan, not an annual push.

---

### Critical Finding: Rule 12 Is Dead Code

**Rule 12** (`checkout-abandon-retry`, priority 32):

```typescript
condition: (ctx) =>
  ctx.features.subscription_propensity >= ctx.thresholds.high_propensity &&  // propensity >= 60
  ctx.features.checkout_starts_30d > 0,
action: 'SHOW_SAVE_OFFER',
```

**Problem:** This rule's conditions are a strict subset of **Rule 9** (`high-propensity-low-price-sensitivity`, priority 31):

```typescript
condition: (ctx) =>
  ctx.features.subscription_propensity >= ctx.thresholds.high_propensity &&  // propensity >= 60
  ctx.features.subscription_propensity < ctx.thresholds.very_high_propensity &&  // propensity < 80
  ctx.features.price_sensitivity < ctx.thresholds.high_price_sensitivity,  // price_sensitivity < 65
action: 'SHOW_MONTHLY',
```

Rule 9 fires at priority 31, before Rule 32. For any reader with `propensity >= 60 AND < 80 AND price_sensitivity < 65`, Rule 9 fires first and returns `SHOW_MONTHLY`. Rule 12 is **never reachable**.

The only readers Rule 12 could theoretically catch are those with `propensity >= 80 AND checkout_starts_30d > 0`. For these, Rule 40 or 41 fires first.

**Fix:** Either delete Rule 12, or merge its logic by having Rule 9/40/41 check for `checkout_starts_30d > 0` and elevate confidence when present.

---

## Phase 4: Scoring Formula Audit

### Formula 1: Engagement Score

```
score = (
  recencyScore    * 20  +
  frequencyScore  * 20  +
  depthScore      * 20  +
  completionScore * 15  +
  premiumScore    * 15  +
  consistencyScore* 10
) / 100

recencyScore    = max(0, 100 - days_since_last_visit * 5)         // zero after 20 days
frequencyScore  = min(100, sessions_30d * 3.3)                      // 30 sessions → 100
depthScore      = avg_scroll_depth                                   // 0–100 (assumed)
completionScore  = avg_completion_rate * 100                          // 0–1 → 0–100
premiumScore     = min(100, premium_articles_30d * 10)               // 10 articles → 100
consistencyScore= min(100, (sessions_7d / (sessions_30d/4)) * 100)  // sessions_7d vs expected weekly
```

**Issues:**
- `depthScore` uses `avg_scroll_depth` directly — the range is undefined in the code. If `avg_scroll_depth` is a percentage (0–100), it receives 20/100 = 20% weight with no normalization. If it's a ratio (0–1), it's 20× underweighted compared to other 0–100 scores.
- **Recency cliff:** `recencyScore = 0` after 20 days. A reader who visits every 21 days scores the same recency as one who visits once a year.
- **Consistency denominator instability:** If `sessions_30d = 1`, expectedWeekly = 0.25, `sessions_7d / 0.25 = 4×`. If `sessions_7d = 1`, `consistencyScore = min(100, 400) = 100` — a reader with 1 session in 7 days and 1 session in 30 days scores MAXIMUM consistency. This is a division-by-low-number artifact.
- **Double-counting risk:** `sessions_7d` and `sessions_30d` appear in both engagement and churn risk calculations.

**Fix:** Cap the consistency denominator at 1.0. Normalize all subcomponents to 0–100 before applying weights. Consider replacing the recency cliff with exponential decay.

---

### Formula 2: Subscription Propensity

```
score = 0
  + (is_registered                          ? 20 : 0)
  + (has_newsletter                         ? 15 : 0)
  + min(15, premium_reads_30d * 1.5)
  + (avg_completion_rate > 0.7              ? 10 : 0)
  + (has_clicked_paywall                    ? 15 : 0)
  + (has_started_checkout                   ? 20 : 0)
  + (is_former_subscriber                   ? 25 : 0)
  + (engagement_score >= 70                 ? 10 : 0)
  + (sessions_30d >= 10                     ?  5 : 0)
  + (content_loyalty >= 60                  ?  5 : 0)
  + (!is_anonymous AND days_since_last_visit <= 3 ? 5 : 0)

→ capped at 100
```

**Issues:**
- **No diminishing returns:** `is_registered = +20`, `has_started_checkout = +20`, `is_former_subscriber = +25`. These are binary — a reader who registered in 2019 gets the same +20 as one who registered yesterday.
- **is_former_subscriber = +25** is the single largest bonus. Combined with `has_started_checkout = +20`, a churned subscriber who abandoned checkout reaches 45/100 before any engagement signals.
- **Overlapping signals:** `!is_anonymous` overlaps with `is_registered` — a registered reader satisfies both conditions.
- **No ceiling on engagement_score contribution:** The +10 for `engagement_score >= 70` stacks with all other bonuses. A very engaged former subscriber with checkout history can exceed 90.

**Fix:** Add time decay to identity signals. Reduce the former_subscriber bonus when churn was recent vs. years ago.

---

### Formula 3: Price Sensitivity

```
score = 50  // baseline
  + min(30, checkout_abandons * 15)    // +15 per abandonment, capped at +30
  + (has_promo_history ? 15 : 0)       // +15 if ever used a promo
  - (has_full_price_history ? 20 : 0) // -20 if ever paid full price
  - (has_annual_subscription ? 15 : 0) // -15 if annual subscriber
  - (subscription_propensity >= 80 ? 10 : 0)  // -10 for high-propensity

→ capped at [0, 100]
```

**Issues:**
- **Checkout abandon is extremely loud:** 1 checkout abandon = +15. A reader who abandoned checkout once (but subsequently subscribed at full price) scores: `50 + 15 - 20 = 45` — barely distinguishable from a reader who did nothing.
- **Baseline of 50 means all scores cluster near center:** The range of actionable differentiation is roughly 20–80.
- **has_full_price_history and has_promo_history are binary** with no recency or volume weighting.

**Fix:** Weight checkout_abandons by recency. Apply diminishing returns on the penalty side.

---

### Formula 4: Churn Risk

```
score = 0
  + (sessions_7d < expectedWeeklySessions * 0.5 ? 30
     : sessions_7d < expectedWeeklySessions * 0.75 ? 15 : 0)
  + (days_since_last_visit > 14 ? 30
     : days_since_last_visit > 7  ? 20
     : days_since_last_visit > 3  ? 10 : 0)
  + (articles_7d < expectedWeeklyArticles * 0.5 ? 20 : 0)
  + (is_newsletter_inactive ? 10 : 0)
  + (renewal_in_7_days ? 10 : 0)

→ capped at [0, 100], returns 0 if status != ACTIVE
```

**Issues:**
- **Inactive readers return 0:** If `subscription_status != 'ACTIVE'`, churn risk is hardcoded to 0. A CANCELLED subscriber with zero engagement scores 0 churn risk — which is technically correct (they already churned) but means the score is meaningless for non-active states.
- **renewal_in_7_days is a single boolean** with no actual renewal date verification — relies on external data quality.
- **Tiered scoring creates plateaus:** 14+ days = +30, 7+ days = +20. A reader gone 14 days scores the same as one gone 365 days.

---

### Formula 5: Estimated LTV

```
estimated_ltv = (
  base_revenue * retention_multiplier * churn_adjustment
) + upsell_potential

base_revenue          = is_annual ? monthly_price * 12 : monthly_price
retention_multiplier  = 1 + (engagement_score / 100) * 3   // 1x to 4x
churn_adjustment       = 1 - (churn_risk / 200)            // 0.5x to 1.0x
upsell_potential      = (subscription_propensity / 100) * monthly_price * 6
```

**Issues:**
- **Feedback loop:** `engagement_score` feeds into LTV, and LTV (as `predicted_ltv`) is stored back into `reader_features`. Downstream propensity recalculation uses this LTV, which used engagement, creating circular dependency.
- **upsell_potential assumes 6 months of additional revenue** regardless of subscription length. A brand-new subscriber with high propensity gets the same upsell component as a 3-year subscriber.
- **No tenure weighting:** A subscriber who has been paying for 3 years has much higher confirmed LTV than the model predicts, but tenure is not an input.
- **No discount rate:** Future revenue is not discounted, so a subscriber expected to churn in 2 months has the same base_revenue as one expected to stay 5 years.

**Fix:** Add `subscription_tenure_months` as an input. Replace the fixed upsell component with a tenure-adjusted projection. Add a discount rate for long-horizon predictions.

---

### Formula 6: Content Loyalty

**File:** `src/scoring/index.ts`, line 278–279:

```typescript
// Content loyalty = engagement * topic breadth
const topicBreadth = features.registrations ?? 0;
const contentLoyalty = Math.round((engagement * Math.min(100, topicBreadth * 5)) / 100);
```

**Issue:** `topicBreadth` uses `features.registrations` — the count of account registrations. This has nothing to do with topic breadth. A reader who registered once scores `content_loyalty = engagement * 5 / 100`; a reader who registered 3 times scores `engagement * 15 / 100`. This is not content loyalty — it is a registration multiplier.

**Correct formula should be:** number of distinct high-affinity topics, or topic affinity score variance, not registration count.

**Fix:** Replace with `features.topic_affinity?.length ?? 0` or a proper distinct-topic count.

---

## Priority Fixes

### Fix 1: Dashboard demo mode indicator (D9)
**Severity:** MEDIUM | **Effort:** Low

Add `_demo` to the `DashboardData` interface and render a dismissible amber banner in `DashboardPage` when `_demo === true`.

### Fix 2: Fix unique_readers funnel count (D2)
**Severity:** CRITICAL | **Effort:** Medium

Replace `sbCount('events', ...)` with a distinct reader count. Requires either a Supabase RPC or adding a `readers` table index on `last_seen_at`.

### Fix 3: Delete dead Rule 12 (Phase 3)
**Severity:** MEDIUM | **Effort:** Trivial

Rule `checkout-abandon-retry` is unreachable. Delete it or merge its logic into Rule 9/31 by checking `checkout_starts_30d > 0` and adjusting confidence.

### Fix 4: Fix content_loyalty formula (Phase 4)
**Severity:** HIGH | **Effort:** Low

Replace `features.registrations` with a proper distinct-topic-count from `topic_affinity`.

### Fix 5: Fix active_readers_30d (D11)
**Severity:** HIGH | **Effort:** Low

Change `sbCount('readers', '')` to `sbCount('readers', 'last_seen_at=gte.${thirtyDaysAgo}')`.

### Fix 6: Fix revenue_per_1000_readers denominator (D12)
**Severity:** HIGH | **Effort:** Low

After Fix 5, use the corrected 30-day active reader count.

### Fix 7: Fix consistencyScore division-by-low-number (Phase 4)
**Severity:** MEDIUM | **Effort:** Low

In `calculateEngagementScore`, change:
```typescript
const expectedWeekly = Math.max(1, sessions30d / 4);
```

### Fix 8: Label all heuristic metrics in UI (D4, D6)
**Severity:** MEDIUM | **Effort:** Low

The KPI card for "Revenue Opportunity" already says "Heuristic estimate" in subtitle — keep this. Extend to opportunity revenue cards.

### Fix 9: Fix avg_ltv zero-LTV exclusion (D10)
**Severity:** MEDIUM | **Effort:** Low

Remove the `filter(r => Number(r.predicted_ltv ?? 0) > 0)` guard and document the resulting average includes churned subscribers.

### Fix 10: Supabase RPC exec_sql removal (D8)
**Severity:** HIGH | **Effort:** Low

Remove the `sbRpc` function from `opportunities.ts`. It is dead code and a security risk if ever enabled.
