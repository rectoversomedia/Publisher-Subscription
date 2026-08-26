// ============================================================
// News Moment Detection
// ============================================================

import { supabaseAdmin } from '@/lib/supabase';
import type { NewsMoment } from '@/domain/types';

export async function detectNewsMoments(): Promise<NewsMoment[]> {
  const moments: NewsMoment[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get traffic by topic in last hour
  const { data: recentEvents } = await supabaseAdmin
    .from('events')
    .select('reader_id, article_id, events(article_id)')
    .eq('event_name', 'article_view')
    .gte('timestamp', oneHourAgo.toISOString());

  // Get baseline by article
  const { data: baselineEvents } = await supabaseAdmin
    .from('events')
    .select('article_id')
    .eq('event_name', 'article_view')
    .gte('timestamp', sevenDaysAgo.toISOString())
    .lt('timestamp', oneHourAgo.toISOString());

  // Get article topics
  const { data: articles } = await supabaseAdmin
    .from('articles')
    .select('id, topic, category');

  if (!articles || articles.length === 0) return [];

  // Calculate per-article baselines
  const baselineByArticle = new Map<string, number>();
  for (const event of baselineEvents ?? []) {
    if (event.article_id) {
      baselineByArticle.set(
        event.article_id,
        (baselineByArticle.get(event.article_id) ?? 0) + 1
      );
    }
  }

  // Calculate recent traffic per topic
  const recentByTopic = new Map<string, number>();
  const recentByCategory = new Map<string, number>();
  const readerSetByTopic = new Map<string, Set<string>>();

  for (const event of recentEvents ?? []) {
    const article = articles.find((a) => a.id === event.article_id);
    if (article) {
      recentByTopic.set(article.topic, (recentByTopic.get(article.topic) ?? 0) + 1);
      recentByCategory.set(article.category, (recentByCategory.get(article.category) ?? 0) + 1);
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
    const baseline = baselineByArticle.get(article.id) ?? 0;
    const baselinePerHour = baseline / (7 * 24);
    const currentTraffic = recentByTopic.get(article.topic) ?? 0;

    if (baselinePerHour > 0 && currentTraffic > baselinePerHour * 3) {
      const lift = currentTraffic / Math.max(1, baselinePerHour);

      // Get reader quality
      const { data: readerFeatures } = await supabaseAdmin
        .from('reader_features')
        .select('subscription_propensity')
        .in('reader_id', Array.from(readerSetByTopic.get(article.topic) ?? []));

      const highPropReaders = readerFeatures?.filter(
        (r) => (r.subscription_propensity ?? 0) >= 60
      ).length ?? 0;

      moments.push({
        id: `nm_${article.id}_${Date.now()}`,
        topic: article.topic,
        category: article.category,
        article_id: article.id,
        baseline_traffic: Math.round(baselinePerHour),
        current_traffic: currentTraffic,
        traffic_lift_percentage: lift * 100 - 100,
        new_readers: 0,
        returning_readers: readerSetByTopic.get(article.topic)?.size ?? 0,
        high_propensity_readers: highPropReaders,
        estimated_incremental_revenue: highPropReaders * 290000 * 0.03,
        severity: lift > 5 ? 'HIGH' : lift > 3 ? 'MEDIUM' : 'LOW',
        status: 'ACTIVE',
        detected_at: now.toISOString(),
        expired_at: null,
      });
    }
  }

  // Persist new moments
  if (moments.length > 0) {
    await supabaseAdmin.from('news_moments').insert(moments);
  }

  return moments;
}

export async function getActiveNewsMoments(): Promise<NewsMoment[]> {
  const { data } = await supabaseAdmin
    .from('news_moments')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('traffic_lift_percentage', { ascending: false })
    .limit(10);

  return data as NewsMoment[] ?? [];
}
