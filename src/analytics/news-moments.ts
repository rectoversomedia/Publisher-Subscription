// ============================================================
// News Moment Detection — uses direct Supabase REST API
// ============================================================

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sbQuery(table: string, params: string = '') {
  const url = `${SB_URL}/rest/v1/${table}?${params}`;
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

async function sbInsert(table: string, data: unknown) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SB_KEY,
      'Authorization': `Bearer ${SB_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

interface Article { id: string; topic: string; category: string; }
interface Event { reader_id: string; article_id: string; }

export async function detectNewsMoments() {
  const moments: Array<Record<string, unknown>> = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get all articles
  const articles = await sbQuery('articles', 'select=id,topic,category') as Article[];
  if (!articles || articles.length === 0) return [];

  const articleMap = new Map(articles.map(a => [a.id, a]));

  // Get recent article views (last hour)
  const recentEvents = await sbQuery(
    'events',
    `event_name=eq.article_view&timestamp=gte.${oneHourAgo}&select=reader_id,article_id`
  ) as Event[];

  // Get baseline article views (last 7 days, excluding last hour)
  const baselineEvents = await sbQuery(
    'events',
    `event_name=eq.article_view&timestamp=gte.${sevenDaysAgo}&timestamp=lt.${oneHourAgo}&select=article_id`
  ) as Array<{article_id: string}>;

  // Calculate per-topic baselines and recent traffic
  const baselineByTopic = new Map<string, number>();
  const recentByTopic = new Map<string, number>();
  const readerSetByTopic = new Map<string, Set<string>>();

  for (const event of baselineEvents) {
    const article = articleMap.get(event.article_id);
    if (article) {
      baselineByTopic.set(article.topic, (baselineByTopic.get(article.topic) ?? 0) + 1);
    }
  }

  for (const event of recentEvents) {
    const article = articleMap.get(event.article_id);
    if (article) {
      recentByTopic.set(article.topic, (recentByTopic.get(article.topic) ?? 0) + 1);
      if (event.reader_id) {
        if (!readerSetByTopic.has(article.topic)) {
          readerSetByTopic.set(article.topic, new Set());
        }
        readerSetByTopic.get(article.topic)!.add(event.reader_id);
      }
    }
  }

  // Detect anomalies (3x+ baseline)
  for (const article of articles) {
    const baseline = baselineByTopic.get(article.topic) ?? 0;
    const baselinePerHour = baseline / (7 * 24);
    const currentTraffic = recentByTopic.get(article.topic) ?? 0;

    if (baselinePerHour > 0 && currentTraffic > baselinePerHour * 3) {
      const lift = currentTraffic / Math.max(1, baselinePerHour);
      const topic = article.topic;

      // Get reader quality for this topic
      const readerIds = Array.from(readerSetByTopic.get(topic) ?? []);
      let highPropReaders = 0;
      if (readerIds.length > 0) {
        const idsParam = readerIds.map(id => encodeURIComponent(id)).join(',');
        const features = await sbQuery(
          'reader_features',
          `reader_id=in.(${idsParam})&subscription_propensity=gte.60&select=id`
        );
        highPropReaders = Array.isArray(features) ? features.length : 0;
      }

      moments.push({
        id: `nm_${article.id}_${Date.now()}`,
        topic,
        category: article.category,
        article_id: article.id,
        baseline_traffic: Math.round(baselinePerHour),
        current_traffic: currentTraffic,
        traffic_lift_percentage: lift * 100 - 100,
        new_readers: 0,
        returning_readers: readerSetByTopic.get(topic)?.size ?? 0,
        high_propensity_readers: highPropReaders,
        estimated_incremental_revenue: highPropReaders * 290000 * 0.03,
        severity: lift > 5 ? 'HIGH' : lift > 3 ? 'MEDIUM' : 'LOW',
        status: 'ACTIVE',
        detected_at: now.toISOString(),
        expired_at: null,
      });
    }
  }

  if (moments.length > 0) {
    await sbInsert('news_moments', moments);
  }

  return moments;
}

export async function getActiveNewsMoments() {
  const data = await sbQuery(
    'news_moments',
    'status=eq.ACTIVE&order=traffic_lift_percentage.desc&limit=10'
  );
  return data;
}
