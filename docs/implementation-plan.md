# Tempo Reader Revenue Brain — Implementation Plan
**Powered by Rectoverso**
**Version:** 1.0 MVP
**Date:** 2026-08-26

---

## 1. Product Vision

**Tempo Reader Revenue Brain** is an intelligent reader-revenue decisioning and experimentation layer for Tempo Digital. It continuously answers: *"What is the next best action for each reader, at this moment, to maximize expected subscription revenue and long-term reader lifetime value?"*

It sits **above** Tempo's existing infrastructure (CMS, analytics, CRM, subscription, payment) as an intelligence and decisioning layer — not a replacement.

The north-star metric is **Incremental Reader Revenue**.

---

## 2. Architecture Overview

```
TEMPO EXISTING ECOSYSTEM
  Website / App / CMS / Analytics / CRM / Subscription / Payment
         ↓ events / API / feature data
TEMPO READER REVENUE BRAIN (this system)
  Reader Intelligence → Scoring Engine → Decision Engine → Experiment Engine
  ↓ decision API
TEMPO ACTIVATION LAYER
  Paywall / Registration Wall / Subscription Offer / Email / Push / Ads
```

---

## 3. Technical Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui, Recharts, TanStack Table, TanStack Query |
| Backend | Next.js API routes (serverless-first) |
| Database | PostgreSQL (Supabase-compatible), Prisma ORM |
| Realtime | SSE for live simulator |
| Cache | In-memory (MVP), Redis-ready architecture |
| Queue | In-memory event queue (MVP), Kafka-ready |
| Event Store | PostgreSQL JSONB (MVP), ClickHouse-ready |
| Deployment | Vercel-compatible |

---

## 4. Database Schema

### Core Tables

- `readers` — reader identity and subscription state
- `reader_features` — calculated behavioral features and scores
- `reader_topic_affinity` — per-topic affinity scores
- `articles` — article metadata
- `events` — all behavioral events (JSONB metadata)
- `offers` — subscription offer catalog
- `decisions` — every Revenue Brain decision with full trace
- `experiments` — experiment definitions
- `experiment_variants` — variant definitions
- `experiment_assignments` — sticky reader assignments
- `conversions` — conversion attribution
- `opportunities` — detected revenue opportunities
- `content_metrics` — per-article revenue metrics
- `news_moments` — traffic anomaly detections
- `system_config` — editable thresholds and feature flags
- `audit_logs` — system audit trail

### Key Indexes

```sql
CREATE INDEX events_reader_id ON events(reader_id);
CREATE INDEX events_timestamp ON events(timestamp);
CREATE INDEX events_event_name ON events(event_name);
CREATE INDEX decisions_reader_id ON decisions(reader_id);
CREATE INDEX decisions_timestamp ON decisions(timestamp);
CREATE INDEX experiment_assignments_reader_id ON experiment_assignments(reader_id);
CREATE INDEX reader_features_propensity ON reader_features(subscription_propensity);
CREATE INDEX opportunities_detected_at ON opportunities(detected_at);
```

---

## 5. Scoring Engine

### 5.1 Engagement Score (0–100)

**Formula:**
```
Recency (20%): max(0, 100 - days_since_last_visit × 5)
Frequency (20%): min(100, sessions_30d × 3.3)
Depth (20%): avg_scroll_depth
Completion (15%): avg_completion_rate × 100
Premium (15%): min(100, premium_articles_30d × 10)
Consistency (10%): sessions_7d / max(sessions_30d/4, 1) × 100
```

### 5.2 Subscription Propensity (0–100)

**Rule-based MVP. Heuristic signals:**
- registered_reader: +20
- newsletter_signup: +15
- premium_reads_30d: +1 per article (max 15)
- high_completion: +10
- paywall_clicked: +15
- checkout_started: +20
- former_subscriber: +25
- high_engagement: +10
- returning_visitor: +5
- high_content_loyalty: +5

**Bands:**
- 0–29: LOW
- 30–59: MEDIUM
- 60–79: HIGH
- 80–100: VERY_HIGH

### 5.3 Price Sensitivity (0–100)

- checkout_abandoned_after_price: +20 per instance (max 40)
- promo_subscription_history: +15
- full_price_subscription_history: -20
- annual_subscription: -15
- high_propensity: -10

### 5.4 Churn Risk (0–100)

Active subscribers only:
- falling_sessions: +30 if sessions_7d < sessions_30d/6
- days_since_last_visit > 7: +20
- declining_articles: +20 if articles_7d < articles_30d/8
- newsletter_inactive: +10
- renewal_proximity: +10 if within 7 days

### 5.5 Estimated LTV

```
base_ltv = monthly_price × 12
retention_multiplier = 1 + (engagement_score / 100) × 3
upsell_potential = (propensity / 100) × monthly_price × 6
estimated_ltv = base_ltv × retention_multiplier + upsell_potential
```

Label as "Estimated LTV" — not precise.

---

## 6. Revenue Decision Engine

### Supported Actions

`ALLOW_FREE`, `SHOW_REGISTRATION`, `SHOW_NEWSLETTER_GATE`, `SHOW_SOFT_PAYWALL`, `SHOW_HARD_PAYWALL`, `SHOW_TRIAL`, `SHOW_DAY_PASS`, `SHOW_MONTHLY`, `SHOW_ANNUAL`, `SHOW_BUNDLE`, `SHOW_VIP`, `SHOW_RETENTION_CONTENT`, `SHOW_RENEWAL`, `SHOW_SAVE_OFFER`, `SHOW_WINBACK`, `NO_ACTION`

### Decision Rules (Configurable)

| Priority | Condition | Preferred Action |
|----------|-----------|-----------------|
| 1 | active_subscriber | NO_ACTION / SHOW_RETENTION_CONTENT |
| 2 | propensity < 30 | ALLOW_FREE / SHOW_NEWSLETTER_GATE |
| 3 | propensity 30–59 | SHOW_REGISTRATION |
| 4 | propensity 60–79, price_sensitivity >= 65 | SHOW_MONTHLY / SHOW_TRIAL |
| 5 | propensity 60–79, price_sensitivity < 65 | SHOW_ANNUAL_PROMO |
| 6 | propensity >= 80, price_sensitivity < 40 | SHOW_ANNUAL_FULL |
| 7 | expired_subscriber, engagement > 60 | SHOW_WINBACK |
| 8 | churn_risk >= 75 | SHOW_SAVE_OFFER |
| 9 | returning_reader, no_registration | SHOW_REGISTRATION |

---

## 7. Experiment Framework

### Sticky Assignment

```typescript
hash = sha256(reader_id + experiment_id)
bucket = hash % 100
if (bucket < variant_a_allocation) return variant_a
else if (bucket < variant_a + variant_b) return variant_b
else return control
```

### Metrics

- exposures, clicks, checkout_starts, conversions
- conversion_rate, revenue, revenue_per_exposed
- average_order_value, projected_ltv
- lift_vs_control (with statistical significance flag)

---

## 8. Opportunity Detectors

| Detector | Logic |
|----------|-------|
| high_propensity_generic | Readers with propensity >= 80 receiving ALLOW_FREE |
| traffic_spike | Traffic 3x+ above rolling baseline |
| high_churn_population | Subscribers with churn_risk >= 75 |
| former_subscriber_reactivation | Former subs with engagement_score > 60 |
| checkout_abandonment_spike | Checkout abandonment rate > 40% |
| premium_content_conversion | Premium readers with low propensity receiving generic treatment |
| content_cluster_affinity | Topic cluster with high subscription affinity not monetized |

---

## 9. News Moment Detection

```
baseline = avg traffic last 7 days same hour
current = traffic last hour
lift = (current - baseline) / baseline
if lift > 3x: HIGH
if lift > 1.5x: MEDIUM
```

---

## 10. Execution Modes

| Mode | Behavior |
|------|----------|
| SHADOW | Calculate recommendation, store, do not change experience |
| CONTROLLED | Apply to configured % of eligible traffic |
| LIVE | Full eligible traffic |

---

## 11. API Surface

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/events` | POST | Event ingestion (single/batch) |
| `/api/v1/decision` | POST | Get next best action |
| `/api/v1/readers` | GET | List readers |
| `/api/v1/readers/[id]` | GET | Reader detail |
| `/api/v1/experiments` | GET/POST | Manage experiments |
| `/api/v1/opportunities` | GET | List opportunities |
| `/api/v1/health` | GET | Health check |

---

## 12. UI Pages

- `/` — Executive Dashboard
- `/readers` — Reader Explorer
- `/readers/[id]` — Reader Detail
- `/decisions` — Decision Log
- `/experiments` — Experiments
- `/experiments/[id]` — Experiment Detail
- `/opportunities` — Opportunity Radar
- `/content` — Content Revenue Intelligence
- `/news-moments` — News Moment Intelligence
- `/copilot` — Revenue Copilot
- `/settings` — Configuration
- `/demo` — Live Executive Demo

---

## 13. Implementation Phases

### Phase A — Foundation
- Next.js 15 project setup, TypeScript strict, Tailwind, shadcn/ui
- Prisma schema and migrations
- Database seed with 50K synthetic readers
- Admin auth (simple email-based)
- Navigation shell and design system

### Phase B — Reader Intelligence
- Event ingestion API
- Reader identity (anonymous + known)
- Reader feature calculation service
- Engagement scoring
- Topic affinity calculation
- Reader profile API

### Phase C — Revenue Decision Engine
- Offers catalog
- Decision rules engine
- Reason codes
- Decision API
- Decision log
- Expected value framework

### Phase D — Experimentation
- Experiment CRUD
- Sticky assignment
- Variant tracking
- Exposure/conversion tracking
- Lift calculation

### Phase E — Revenue Intelligence
- Attribution engine
- Incremental revenue calculation
- Opportunity detectors
- Content revenue intelligence
- News moment detection

### Phase F — Executive Experience
- Executive dashboard with live KPIs
- Reader explorer with filters
- Reader detail with journey timeline
- Opportunity radar
- Content revenue page
- Live demo simulator

### Phase G — Copilot
- Trusted analytics function registry
- Intent parsing
- Deterministic Q&A
- Optional LLM summarization (OpenAI)

---

## 14. Demo Data

**Scale:**
- 50,000 readers
- 500,000+ events
- 200 articles
- 10 topics
- 5+ subscription offers
- Active experiments

**Reader Segments:**
- Casual anonymous (40%)
- Engaged anonymous (20%)
- Registered non-subscriber (25%)
- Active subscribers (8%)
- Former subscribers (5%)
- At-risk subscribers (2%)

---

## 15. Technical Risks

| Risk | Mitigation |
|------|-----------|
| Large seed script timeout | Make generator configurable, batch inserts |
| Complex scoring calculations slow | Pre-compute features, update on events |
| Decision rules become spaghetti | Centralized rule registry with config |
| Attribution complexity | Simple rules-first, document assumptions |
| ML expectations vs heuristic reality | Label clearly, show confidence bands |

---

## 16. Assumptions

1. Tempo has PostgreSQL-compatible infrastructure (Supabase)
2. Demo mode is sufficient for initial demonstration
3. Deterministic hashing is adequate for experiment assignment
4. Rule-based MVP is sufficient until real data exists
5. PostgreSQL JSONB is sufficient for event store until ClickHouse migration
6. Simple email auth is sufficient for admin access
7. 50K synthetic readers are sufficient for demo quality
8. Single Next.js app is sufficient for MVP complexity

---

## 17. What Is NOT Built

- Full billing / checkout engine / payment gateway
- Authentication provider / identity graph
- Full CRM / email sender / push infrastructure
- Ad buying platform / CMS
- Probabilistic identity resolution
- Autonomous contextual bandit
- Real ML models (architecture prepared)

---

## 18. Success Criteria

The MVP is complete when:
- [ ] Clean install + migrations + seed work
- [ ] Event ingestion updates reader features
- [ ] Scores calculate correctly
- [ ] Different readers receive different explainable treatments
- [ ] A/B experiments assign sticky variants
- [ ] Conversions track and attribute to decisions
- [ ] Opportunities generate from data
- [ ] Executive dashboard shows real database numbers
- [ ] Live demo simulator runs
- [ ] All API endpoints respond correctly
- [ ] TypeScript strict passes
- [ ] Unit tests pass
- [ ] No hardcoded fake dashboard data
