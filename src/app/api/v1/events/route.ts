// POST /api/v1/events — Event Ingestion
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { recalculateAllScores } from '@/scoring';
import type { IngestEvent } from '@/domain/types';

const EventSchema = z.object({
  event_id: z.string().optional(),
  anonymous_id: z.string().optional(),
  reader_id: z.string().optional(),
  session_id: z.string(),
  event: z.string(),
  timestamp: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
});

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

async function processEvent(event: IngestEvent): Promise<void> {
  const eventId = event.event_id ?? generateEventId();
  const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();

  // Deduplicate
  const { data: existing } = await supabaseAdmin
    .from('events')
    .select('id')
    .eq('event_id', eventId)
    .single();

  if (existing) return;

  // Resolve reader
  let resolvedReaderId = event.reader_id ?? null;

  if (!resolvedReaderId && event.anonymous_id) {
    const { data: reader } = await supabaseAdmin
      .from('readers')
      .select('id')
      .eq('anonymous_id', event.anonymous_id)
      .single();
    if (reader) resolvedReaderId = reader.id;
  }

  const articleId = event.properties?.article_id as string | undefined;

  // Fetch article context for denormalization (category, topic) + premium check
  let articleCategory: string | null = null;
  let articleTopic: string | null = null;
  let contentType: string | null = null;
  let isPremium = false;

  if (articleId) {
    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('category, topic, is_premium')
      .eq('id', articleId)
      .single();
    if (article) {
      articleCategory = article.category ?? null;
      articleTopic = article.topic ?? null;
      contentType = article.category ?? null; // category as content_type for now
      isPremium = article.is_premium ?? false;
    }
  }

  // ── Insert event with denormalized article context ──────────────
  await supabaseAdmin.from('events').insert({
    event_id: eventId,
    reader_id: resolvedReaderId,
    anonymous_id: event.anonymous_id,
    session_id: event.session_id,
    event_name: event.event,
    article_id: articleId,
    article_category: articleCategory,
    article_topic: articleTopic,
    content_type: contentType,
    timestamp: timestamp.toISOString(),
    source: (event.properties?.source as string) ?? 'web',
    metadata: event.properties ?? {},
  });

  // ── Track premium article views for metering ─────────────────────
  if (resolvedReaderId && articleId && isPremium) {
    const { data: feat } = await supabaseAdmin
      .from('reader_features')
      .select('free_articles_read, paywall_meter_reset_at')
      .eq('reader_id', resolvedReaderId)
      .single();

    const now = new Date();
    const resetAt = feat?.paywall_meter_reset_at ? new Date(feat.paywall_meter_reset_at) : null;
    const shouldReset = !resetAt || now >= resetAt;

    await supabaseAdmin
      .from('reader_features')
      .upsert({
        reader_id: resolvedReaderId,
        free_articles_read: shouldReset ? 1 : ((feat?.free_articles_read ?? 0) + 1),
        paywall_meter_reset_at: shouldReset
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : feat?.paywall_meter_reset_at,
      }, { onConflict: 'reader_id' });
  }

  // ── Backfill conversion attribution on subscription_success ───────
  if (resolvedReaderId && event.event === 'subscription_success') {
    const convArticleId = event.properties?.article_id as string | undefined;
    const convSessionId = event.properties?.session_id as string | undefined;
    const convRevenue = (event.properties?.revenue as number) ?? 0;

    // Upsert conversion record if one doesn't exist for this reader+session
    const { data: existingConv } = await supabaseAdmin
      .from('conversions')
      .select('id')
      .eq('reader_id', resolvedReaderId)
      .is('article_id', null)
      .order('occurred_at', { ascending: false })
      .limit(1);

    if (existingConv?.[0]) {
      await supabaseAdmin
        .from('conversions')
        .update({
          article_id: convArticleId ?? null,
          attribution_source: 'paywall',
          session_id: convSessionId ?? null,
        })
        .eq('id', existingConv[0].id);
    } else {
      // No existing conversion — create one
      await supabaseAdmin.from('conversions').insert({
        reader_id: resolvedReaderId,
        conversion_type: 'subscription',
        revenue: convRevenue,
        article_id: convArticleId ?? null,
        attribution_source: 'paywall',
        session_id: convSessionId ?? event.session_id,
        occurred_at: timestamp.toISOString(),
      });
    }
  }

  if (resolvedReaderId) {
    // Build update payload — start with last_seen_at
    const updatePayload: Record<string, unknown> = { last_seen_at: new Date().toISOString() };

    // Capture name/email on register, login, or newsletter_signup events
    const personalEvents = ['register', 'login', 'newsletter_signup', 'subscription_success'];
    if (personalEvents.includes(event.event)) {
      const name = (event.properties?.name as string | undefined) ?? (event.properties?.user_name as string | undefined);
      const email = (event.properties?.email as string | undefined) ?? (event.properties?.user_email as string | undefined);
      if (name) updatePayload.name = name;
      if (email) updatePayload.email = email;
      // If email is captured, upgrade identity status
      if (email && resolvedReaderId) {
        const { data: existing } = await supabaseAdmin
          .from('readers')
          .select('identity_status, email')
          .eq('id', resolvedReaderId)
          .single();
        if (existing && !existing.email) {
          updatePayload.identity_status = existing.identity_status === 'ANONYMOUS' ? 'REGISTERED' : existing.identity_status;
        }
      }
    }

    await supabaseAdmin.from('readers').update(updatePayload).eq('id', resolvedReaderId);

    await recalculateReaderFeatures(resolvedReaderId, event.event === 'article_view' && isPremium);
  }
}

async function recalculateReaderFeatures(readerId: string, isPremiumArticleView: boolean = false): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { data: events30d } = await supabaseAdmin
    .from('events')
    .select('event_name, timestamp, reader_id, article_id, session_id')
    .eq('reader_id', readerId)
    .gte('timestamp', thirtyDaysAgo.toISOString());

  if (!events30d) return;

  const sessions30d = new Set(events30d.filter((e) => e.event_name === 'session_start').map((e) => e.session_id)).size;
  const sessions7d = new Set(events30d.filter((e) => e.event_name === 'session_start' && new Date(e.timestamp) >= sevenDaysAgo).map((e) => e.session_id)).size;

  const articleViews30d = events30d.filter((e) => e.event_name === 'article_view').length;
  const articleViews7d = events30d.filter((e) => e.event_name === 'article_view' && new Date(e.timestamp) >= sevenDaysAgo).length;

  const completionEvents = events30d.filter((e) => e.event_name === 'article_complete');
  const avgCompletionRate = articleViews30d > 0 ? completionEvents.length / articleViews30d : 0;

  const paywallViews = events30d.filter((e) => e.event_name === 'paywall_view').length;
  const offerClicks = events30d.filter((e) => ['subscription_offer_click', 'paywall_click'].includes(e.event_name)).length;
  const checkoutStarts = events30d.filter((e) => e.event_name === 'checkout_start').length;
  const newsletterSignups = events30d.filter((e) => e.event_name === 'newsletter_signup').length;
  const registrations = events30d.filter((e) => e.event_name === 'registration_complete').length;

  const { data: premiumArticles } = await supabaseAdmin
    .from('articles')
    .select('id')
    .eq('is_premium', true);

  const premiumIds = new Set(premiumArticles?.map((a) => a.id) ?? []);
  const premiumArticles30d = events30d.filter((e) => e.article_id && premiumIds.has(e.article_id)).length;

  const { data: reader } = await supabaseAdmin
    .from('readers')
    .select('subscription_status, subscription_expires_at, first_seen_at, last_seen_at')
    .eq('id', readerId)
    .single();

  if (!reader) return;

  // Count distinct topics the reader has affinity toward
  const { count: topicAffinityCount } = await supabaseAdmin
    .from('reader_topic_affinity')
    .select('id', { count: 'exact', head: true })
    .eq('reader_id', readerId);

  const lastSeen = new Date(reader.last_seen_at);
  const daysSinceLastVisit = Math.round((Date.now() - lastSeen.getTime()) / (24 * 60 * 60 * 1000));

  const scrollEvents = events30d.filter((e) => e.event_name?.startsWith('scroll_'));
  const avgScrollDepth = articleViews30d > 0 ? (scrollEvents.length / articleViews30d) * 90 : 0;

  const features = {
    sessions_7d: sessions7d,
    sessions_30d: sessions30d,
    articles_7d: articleViews7d,
    articles_30d: articleViews30d,
    premium_articles_30d: premiumArticles30d,
    avg_scroll_depth: Math.min(100, avgScrollDepth),
    avg_completion_rate: avgCompletionRate,
    paywall_views_30d: paywallViews,
    offer_clicks_30d: offerClicks,
    checkout_starts_30d: checkoutStarts,
    days_since_last_visit: daysSinceLastVisit,
    newsletter_signups: newsletterSignups,
    registrations,
    topic_affinity_count: topicAffinityCount ?? 0,
    former_subscriber: reader.subscription_status === 'EXPIRED',
    is_suspected_bot: sessions30d > 200 || articleViews30d > 500,
  };

  const scores = recalculateAllScores(features, {
    propensity: {
      is_registered: false,
      has_newsletter: newsletterSignups > 0,
      premium_reads_30d: premiumArticles30d,
      avg_completion_rate: avgCompletionRate,
      has_clicked_paywall: offerClicks > 0,
      has_started_checkout: checkoutStarts > 0,
      is_former_subscriber: reader.subscription_status === 'EXPIRED',
      engagement_score: 0,
      sessions_30d: sessions30d,
      content_loyalty: 0,
      is_anonymous: true,
      days_since_last_visit: daysSinceLastVisit,
    },
    churn: {
      subscription_status: reader.subscription_status,
      sessions_7d: sessions7d,
      sessions_30d: sessions30d,
      articles_7d: articleViews7d,
      articles_30d: articleViews30d,
      days_since_last_visit: daysSinceLastVisit,
      is_newsletter_inactive: newsletterSignups === 0,
      renewal_in_7_days: false,
      subscription_expires_at: reader.subscription_expires_at,
    },
    price: {
      checkout_abandons: 0,
      has_promo_history: false,
      has_full_price_history: false,
      has_annual_subscription: false,
      subscription_propensity: 0,
    },
    ltv: {
      monthly_price: 64000,
      engagement_score: 0,
      subscription_propensity: 0,
      churn_risk: 0,
      is_annual: false,
    },
  }, reader.subscription_status);

  await supabaseAdmin
    .from('reader_features')
    .upsert({
      reader_id: readerId,
      ...features,
      ...scores,
    }, { onConflict: 'reader_id' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let events: IngestEvent[];

    if (Array.isArray(body)) {
      events = body as IngestEvent[];
    } else if (body.events && Array.isArray(body.events)) {
      const parsed = z.object({ events: z.array(EventSchema) }).safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid batch format' }, { status: 400 });
      }
      events = parsed.data.events;
    } else {
      const parsed = EventSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid event format', details: parsed.error.issues }, { status: 400 });
      }
      events = [parsed.data];
    }

    const results = await Promise.allSettled(events.map(processEvent));

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({
      accepted: succeeded,
      failed,
      total: events.length,
    }, { status: 207 });
  } catch (error) {
    console.error('Event ingestion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
