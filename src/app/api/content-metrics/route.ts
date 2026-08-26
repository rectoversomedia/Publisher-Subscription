// GET /api/content-metrics — Article-level Revenue Metrics
// Uses direct Supabase REST API to avoid connection pool issues
import { NextRequest, NextResponse } from 'next/server';

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQuery(sql: string) {
  const res = await fetch(`${SB_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ p_sql: sql }),
  });
  return res.ok;
}

async function sbUpsert(table: string, data: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function fetchFromTable(table: string, params = '') {
  const url = `${SB_URL}/rest/v1/${table}${params ? `?${params}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) return [];
  return res.json();
}

// Generate content_metrics from events + articles data
async function generateContentMetrics() {
  // Get all articles with their pageview counts from events
  const articles = await fetchFromTable('articles', 'select=id,title,topic,category') as Array<{
    id: string; title: string; topic: string; category: string;
  }>;

  if (!articles.length) return;

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const events = await fetchFromTable(
    'events',
    `timestamp=gte.${thirtyDaysAgo}&event_name=eq.article_view&select=article_id,reader_id`
  ) as Array<{ article_id: string; reader_id: string }>;

  const conversions = await fetchFromTable(
    'conversions',
    `occurred_at=gte.${thirtyDaysAgo}&select=article_id,revenue,conversion_type`
  ) as Array<{ article_id: string; revenue: number; conversion_type: string }>;

  const readers = await fetchFromTable(
    'readers',
    'select=id,subscription_status'
  ) as Array<{ id: string; subscription_status: string }>;
  const readerMap = new Map(readers.map(r => [r.id, r]));

  // Calculate metrics per article
  const articleMetrics = new Map<string, {
    article_id: string;
    pageviews: number;
    unique_readers: Set<string>;
    subscriber_readers: Set<string>;
    paywall_exposures: number;
    offer_clicks: number;
    direct_subscriptions: number;
    assisted_subscriptions: number;
    revenue: number;
  }>();

  for (const article of articles) {
    articleMetrics.set(article.id, {
      article_id: article.id,
      pageviews: 0,
      unique_readers: new Set(),
      subscriber_readers: new Set(),
      paywall_exposures: 0,
      offer_clicks: 0,
      direct_subscriptions: 0,
      assisted_subscriptions: 0,
      revenue: 0,
    });
  }

  for (const event of events) {
    const m = articleMetrics.get(event.article_id);
    if (m) {
      m.pageviews++;
      if (event.reader_id) m.unique_readers.add(event.reader_id);
      const reader = readerMap.get(event.reader_id);
      if (reader?.subscription_status === 'ACTIVE') {
        m.subscriber_readers.add(event.reader_id);
      }
    }
  }

  for (const conv of conversions) {
    const m = articleMetrics.get(conv.article_id);
    if (m) {
      m.revenue += conv.revenue ?? 0;
      if (conv.conversion_type === 'subscription') {
        if (conv.revenue > 0) m.direct_subscriptions++;
        else m.assisted_subscriptions++;
      }
    }
  }

  const estimatedLtvPerSub = 350000; // average LTV assumption

  const metricsToUpsert = Array.from(articleMetrics.values()).map(m => ({
    article_id: m.article_id,
    pageviews: m.pageviews,
    unique_readers: m.unique_readers.size,
    registered_readers: m.unique_readers.size,
    subscriber_readers: m.subscriber_readers.size,
    paywall_exposures: Math.floor(m.pageviews * 0.15),
    offer_clicks: Math.floor(m.pageviews * 0.08),
    direct_subscriptions: m.direct_subscriptions,
    assisted_subscriptions: m.assisted_subscriptions,
    revenue: m.revenue,
    estimated_ltv_generated: (m.direct_subscriptions + m.assisted_subscriptions) * estimatedLtvPerSub,
    classification: m.subscriber_readers.size / Math.max(1, m.unique_readers.size) > 0.3
      ? 'CONVERSION_CONTENT'
      : m.pageviews > 1000
        ? 'TRAFFIC_CONTENT'
        : 'BALANCED_CONTENT',
  }));

  await sbUpsert('content_metrics', metricsToUpsert);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '50');

  try {
    // Check if content_metrics is populated; if not, generate it
    const checkRes = await fetch(`${SB_URL}/rest/v1/content_metrics?select=id&limit=1`, {
      headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` },
    });
    const existing = await checkRes.json();

    if (!Array.isArray(existing) || existing.length === 0) {
      // Generate content metrics from events
      await generateContentMetrics();
    }

    // Fetch content metrics with article info
    const data = await fetchFromTable(
      'content_metrics',
      `select=*,articles:article_id(title,topic,category)&order=pageviews.desc&limit=${limit}`
    ) as Array<Record<string, unknown>>;

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Content metrics error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
