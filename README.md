# Tempo Reader Revenue Brain
**Powered by Rectoverso**

An intelligent reader-revenue decisioning and experimentation layer for digital publishers.

## Product Overview

Tempo Reader Revenue Brain sits **above** Tempo's existing infrastructure (CMS, analytics, CRM, subscription, payment) as an intelligence and decisioning layer that continuously answers:

> *"What is the next best action for each reader, at this moment, to maximize expected subscription revenue and long-term reader lifetime value?"*

The north-star metric is **Incremental Reader Revenue**.

## Architecture

```
TEMPO EXISTING ECOSYSTEM
  Website / App / CMS / Analytics / CRM / Subscription / Payment
         ↓ events / API / feature data
TEMPO READER REVENUE BRAIN
  Reader Intelligence → Scoring Engine → Decision Engine → Experiment Engine
  ↓ decision API
TEMPO ACTIVATION LAYER
  Paywall / Registration Wall / Subscription Offer / Email / Push / Ads
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Next.js API routes |
| Database | PostgreSQL (Supabase) |
| ORM | Supabase JS client |
| Deployment | Vercel-compatible |

## Getting Started

### Prerequisites

1. Node.js 18+
2. A Supabase project (or PostgreSQL)
3. pnpm or npm

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations
# Apply the SQL in supabase/migrations/001_initial.sql to your Supabase project

# Seed demo data
pnpm db:seed:demo

# Start development server
pnpm dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `ADMIN_EMAIL` | Admin email for access |
| `AUTH_SECRET` | Secret for session management |
| `DEMO_MODE` | Set to "true" for demo mode |
| `EXECUTION_MODE` | SHADOW / CONTROLLED / LIVE |

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the migration from `supabase/migrations/001_initial.sql`
4. Update your `.env` with Supabase credentials

### Running the Seed Script

```bash
# Generate 5,000 synthetic readers with events, scores, decisions
pnpm db:seed:demo

# This creates:
# - 5,000 readers across 7 segments
# - 200 articles across 10 topics
# - 50,000+ events
# - Reader features and scores
# - Experiments
# - Opportunities
# - Conversions
```

## Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | Executive Dashboard with KPIs |
| `/dashboard/readers` | Reader Explorer |
| `/dashboard/readers/[id]` | Reader Detail Profile |
| `/dashboard/decisions` | Decision Log |
| `/dashboard/experiments` | A/B/n Experiments |
| `/dashboard/opportunities` | Revenue Opportunity Radar |
| `/dashboard/content` | Content Revenue Intelligence |
| `/dashboard/news-moments` | News Moment Detection |
| `/dashboard/copilot` | Revenue Copilot |
| `/dashboard/settings` | System Configuration |
| `/dashboard/demo` | Live Executive Demo |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/events` | POST | Event ingestion |
| `/api/v1/decision` | POST | Get next best action |
| `/api/v1/readers` | GET | List readers |
| `/api/v1/readers/[id]` | GET | Reader detail |
| `/api/v1/experiments` | GET/POST | Manage experiments |
| `/api/v1/opportunities` | GET | List opportunities |
| `/api/v1/health` | GET | Health check |

## Core Modules

- **Scoring Engine** (`src/scoring/index.ts`) - Engagement, propensity, churn, price sensitivity
- **Decision Engine** (`src/decision/index.ts`) - Rule-based next best action
- **Experiment Engine** (`src/experiment/index.ts`) - Sticky A/B/n assignment
- **Analytics** (`src/analytics/`) - KPIs, funnel, attribution, opportunities

## Demo

The demo page (`/dashboard/demo`) showcases the Revenue Brain decisioning with 5 pre-configured reader scenarios:

1. **Casual Visitor** — Low propensity → ALLOW_FREE
2. **Engaged Reader** — Medium propensity → SHOW_MONTHLY
3. **High Intent Reader** — Very high propensity → SHOW_ANNUAL
4. **Former Subscriber** — Returning → SHOW_WINBACK
5. **At-Risk Subscriber** — Declining → SHOW_SAVE_OFFER

## Development

```bash
# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test

# Build
pnpm build
```

## Key Product Principles

1. Revenue outcome before AI novelty
2. Every decision must be explainable
3. Start rule-based, move to ML when data supports it
4. Optimize revenue and LTV, not conversion alone
5. Tempo retains full control
6. Experiments prove value
7. Measure incremental reader revenue

## License

Proprietary — Tempo Digital / Rectoverso
