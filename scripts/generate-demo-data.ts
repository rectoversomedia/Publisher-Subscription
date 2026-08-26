// ============================================================
// Demo Data Generator for Tempo Reader Revenue Brain
// Generates 50K synthetic readers with realistic behavioral data
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ── Configuration ────────────────────────────────────────────

const CONFIG = {
  totalReaders: 5000, // Reduced for faster seeding, scale up in production
  articlesPerTopic: 20,
  eventsPerReader: { min: 5, max: 100 },
  seed: 42,
};

// ── Seed Data ────────────────────────────────────────────────

const TOPICS = [
  'Politics', 'Economy', 'Business', 'National', 'International',
  'Investigation', 'Technology', 'Lifestyle', 'Sports', 'Opinion',
];

const CATEGORIES = [
  'Politik', 'Ekonomi', 'Bisnis', 'Nasional', 'Internasional',
  'Investigasi', 'Teknologi', 'Gaya Hidup', 'Olahraga', 'Opini',
];

const AUTHORS = [
  'Budi Santoso', 'Siti Rahayu', 'Ahmad Wijaya', 'Dewi Kusuma',
  'Rizky Pratama', 'Maya Indira', 'Hendra Gunawan', 'Lisa Permata',
  'Dimas Ardana', 'Nadia Safitri', 'Fajar Nugroho', 'Rina Wulandari',
];

const ARTICLE_TITLES: Record<string, string[]> = {
  Politics: [
    'Koalisi Baru Terbentuk Menjelang Pemilu 2029',
    'Partai Oposisi Tuduh Pemerintah Selewengkan Anggara',
    'Debat Capres Cetar Geneert-Ekonomi Jadi Jurandengan',
    'DPR Setujui Rancangan UU Baru Tentang Stabilitas',
    'Survey: Elektabilitas Kandidat Meningkat Signifikan',
    'MPR Bahas Amandemen Terbatas Pasal Transisional',
    'Legislator Kritik Lambannya Reformasi Birokrasi',
    'Parpol Baru Daftar ke Kementerian Hukum',
    'Pemilihan Kepala Daerah akan Dilaksanakan Maret',
    'Partai Keadilan Raih Kursi Terbanyak di PKB',
  ],
  Investigation: [
    'Investigasi: compounds Korupsi dalam Proyek Infrastruktur',
    'Docements ofongkap Jejaring Mafia Peradilan',
    'Aset Triliunan Rupiah Hilang dari Begawai Negara',
    'Saksi Ahli: Ada Manipulasi Data dalam Proyek Strategis',
    'Investigasi Mendalam: compounds Pencucian Uang di Sektor Energi',
    'Jejak Dana Tidak Sesuai di Tiga Perusahaan State-Owned',
    'compound: compounds Pemalsuan Dokumen oleh Pejabat Tinggi',
    'Kebocoran Data Mengungkap compounds Pencucian Uang',
    'Investigasi: compounds Penyalahgunaan WEstanaan oleh Oknum',
    'Surat Terselubung: compounds Pemerasan di Kalangan Pejabat',
  ],
  Economy: [
    'Bank Indonesia Prediksi Inflasi Melambat di Kuartal IV',
    'Rupiah Menguat terhadap Dollar AS pada Perdagangan Senin',
    'Investasi Asing masuk Sektor Teknologi Meningkat 28%',
    'Omzet UMKM Naik 15% Berkat Platform Digital',
    'Pemerintah Buka WEslanan Baru untuk Investasi Infrastruktur',
    'Pertumbuhan Ekonomi Triwulan III Capai 5.2%',
    'Bursa Efek Indonesia Ditutup Melemah untuk Hari Kedua',
    'Cadangan Devisa Mencapai Rekor Tertinggi Sepanjang Masa',
    'Sektor Manufaktur Prediksi Tumbuh 4.5% Tahun Ini',
    'Kementrian Keuangan Perketat Pengawasan Pajak Digital',
  ],
  Business: [
    'Perusahaan Raksasa Umumkan Ekspansi ke Pasar Asia Tenggara',
    'Startup Lokal Terima Pendanaan Seri B Senilai $50 Juta',
    'Strategi Merger two Gergian Bank Demi Efisiensi',
    'Bos Teknologi Terkaya Indonesia Buka WEslanan Baru',
    'Perusahaan Logistik Umumkan Kerjasama dengan Grab',
    'IPO农业科技公司的股价暴涨200%在首个交易日',
    'Perusahaan Baja Bangun Pabrik Baru di Kalimantan',
    'Pengusaha Teknologi Muda入选 Forbes 30 Under 30',
    'Strategic Partnership: Two Conglomerates Team Up',
    'Retail Giant Hadapi compoundcompoundcompoundcompoundcompound Pertumbuhan E-Commerce',
  ],
};

const SESSION_IDS = [
  'ses_google_organic', 'ses_facebook_referral', 'ses_twitter_share',
  'ses_direct_bookmark', 'ses_newsletter_link', 'ses_push_notification',
  'ses_app_open', 'ses_search_duckduckgo', 'ses_instagram_story',
  'ses_whatsapp_forward', 'ses_youtube_link', 'ses_linkedin_share',
];

// ── Utility Functions ───────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function randomInt(min: number, max: number, rand: () => number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]!;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ── Segment Definitions ─────────────────────────────────────

interface SegmentConfig {
  name: string;
  weight: number; // proportion of total
  identityStatus: 'ANONYMOUS' | 'REGISTERED' | 'KNOWN';
  subscriptionStatus: 'NONE' | 'ACTIVE' | 'EXPIRED' | 'TRIAL';
  sessions30d: [number, number];
  articles30d: [number, number];
  premiumRatio: number; // 0-1
  completionRate: [number, number];
  paywallViews: [number, number];
  offerClicks: [number, number];
  checkoutStarts: [number, number];
  propensityRange: [number, number];
  priceSensitivityRange: [number, number];
  churnRisk: [number, number];
  ltvRange: [number, number];
}

const SEGMENTS: SegmentConfig[] = [
  {
    name: 'Casual Anonymous',
    weight: 0.35,
    identityStatus: 'ANONYMOUS',
    subscriptionStatus: 'NONE',
    sessions30d: [1, 3],
    articles30d: [1, 5],
    premiumRatio: 0.1,
    completionRate: [0.3, 0.6],
    paywallViews: [0, 1],
    offerClicks: [0, 0],
    checkoutStarts: [0, 0],
    propensityRange: [5, 25],
    priceSensitivityRange: [60, 95],
    churnRisk: [0, 0],
    ltvRange: [10000, 50000],
  },
  {
    name: 'Engaged Anonymous',
    weight: 0.18,
    identityStatus: 'ANONYMOUS',
    subscriptionStatus: 'NONE',
    sessions30d: [5, 15],
    articles30d: [8, 25],
    premiumRatio: 0.25,
    completionRate: [0.5, 0.85],
    paywallViews: [1, 4],
    offerClicks: [0, 2],
    checkoutStarts: [0, 1],
    propensityRange: [25, 55],
    priceSensitivityRange: [50, 80],
    churnRisk: [0, 0],
    ltvRange: [40000, 120000],
  },
  {
    name: 'Registered Non-Subscriber',
    weight: 0.22,
    identityStatus: 'REGISTERED',
    subscriptionStatus: 'NONE',
    sessions30d: [4, 20],
    articles30d: [6, 30],
    premiumRatio: 0.35,
    completionRate: [0.55, 0.9],
    paywallViews: [2, 8],
    offerClicks: [0, 3],
    checkoutStarts: [0, 2],
    propensityRange: [30, 72],
    priceSensitivityRange: [40, 78],
    churnRisk: [0, 0],
    ltvRange: [80000, 250000],
  },
  {
    name: 'Active Subscriber',
    weight: 0.10,
    identityStatus: 'KNOWN',
    subscriptionStatus: 'ACTIVE',
    sessions30d: [10, 35],
    articles30d: [15, 50],
    premiumRatio: 0.7,
    completionRate: [0.7, 0.98],
    paywallViews: [0, 0],
    offerClicks: [0, 0],
    checkoutStarts: [0, 0],
    propensityRange: [80, 100],
    priceSensitivityRange: [15, 50],
    churnRisk: [5, 40],
    ltvRange: [200000, 600000],
  },
  {
    name: 'Former Subscriber',
    weight: 0.07,
    identityStatus: 'KNOWN',
    subscriptionStatus: 'EXPIRED',
    sessions30d: [2, 12],
    articles30d: [3, 18],
    premiumRatio: 0.4,
    completionRate: [0.45, 0.85],
    paywallViews: [1, 5],
    offerClicks: [0, 2],
    checkoutStarts: [0, 1],
    propensityRange: [35, 68],
    priceSensitivityRange: [55, 85],
    churnRisk: [0, 0],
    ltvRange: [60000, 180000],
  },
  {
    name: 'At-Risk Subscriber',
    weight: 0.05,
    identityStatus: 'KNOWN',
    subscriptionStatus: 'ACTIVE',
    sessions30d: [1, 5],
    articles30d: [1, 8],
    premiumRatio: 0.5,
    completionRate: [0.3, 0.7],
    paywallViews: [0, 0],
    offerClicks: [0, 0],
    checkoutStarts: [0, 0],
    propensityRange: [75, 95],
    priceSensitivityRange: [20, 55],
    churnRisk: [75, 98],
    ltvRange: [150000, 400000],
  },
  {
    name: 'Investigative Loyalist',
    weight: 0.03,
    identityStatus: 'REGISTERED',
    subscriptionStatus: 'NONE',
    sessions30d: [15, 40],
    articles30d: [30, 80],
    premiumRatio: 0.75,
    completionRate: [0.75, 1.0],
    paywallViews: [5, 15],
    offerClicks: [1, 5],
    checkoutStarts: [0, 2],
    propensityRange: [65, 95],
    priceSensitivityRange: [15, 50],
    churnRisk: [0, 0],
    ltvRange: [300000, 700000],
  },
];

// ── Main Seeding ────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting Tempo Reader Revenue Brain seed...');
  console.log(`📊 Target: ${CONFIG.totalReaders} readers`);
  console.log('');

  const rand = seededRandom(CONFIG.seed);

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await supabase.from('experiment_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('decisions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('conversions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reader_topic_affinity').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('reader_features').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('readers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('articles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('opportunities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('news_moments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('✅ Data cleared');

  // Seed Articles
  console.log('\n📝 Seeding articles...');
  const articles: Array<{
    id: string; title: string; slug: string; category: string;
    topic: string; author: string; is_premium: boolean; published_at: string;
  }> = [];

  for (let i = 0; i < TOPICS.length; i++) {
    const topic = TOPICS[i]!;
    const category = CATEGORIES[i]!;
    const titles = ARTICLE_TITLES[topic] ?? [];
    const articleCount = Math.min(CONFIG.articlesPerTopic, titles.length);

    for (let j = 0; j < articleCount; j++) {
      const title = titles[j % titles.length] || `${topic} News Update ${j + 1}`;
      articles.push({
        id: uuid(),
        title,
        slug: `${topic.toLowerCase()}-${j + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)}`,
        category,
        topic,
        author: randomChoice(AUTHORS, rand),
        is_premium: rand() > 0.2,
        published_at: daysAgo(randomInt(1, 90, rand)),
      });
    }
  }

  // Batch insert articles
  for (let i = 0; i < articles.length; i += 50) {
    await supabase.from('articles').insert(articles.slice(i, i + 50));
  }
  console.log(`✅ ${articles.length} articles created`);

  // Seed Offers
  console.log('\n💰 Seeding offers...');
  const offers = [
    { name: 'Tempo Plus Monthly', plan_type: 'MONTHLY', price: 64000, billing_period: 'monthly', offer_type: 'acquisition', discount_percentage: 0 },
    { name: 'Tempo Plus Monthly Intro', plan_type: 'MONTHLY', price: 29000, billing_period: 'monthly', offer_type: 'acquisition', discount_percentage: 55, original_price: 64000 },
    { name: 'Tempo Plus Annual', plan_type: 'ANNUAL', price: 299000, billing_period: 'annual', offer_type: 'acquisition', discount_percentage: 0 },
    { name: 'Tempo Plus Annual Promo', plan_type: 'ANNUAL', price: 199000, billing_period: 'annual', offer_type: 'acquisition', discount_percentage: 33, original_price: 299000 },
    { name: '7 Day Access', plan_type: 'TRIAL', price: 19000, billing_period: 'one_time', offer_type: 'trial', discount_percentage: 0 },
    { name: 'Day Pass', plan_type: 'DAY_PASS', price: 10000, billing_period: 'one_time', offer_type: 'trial', discount_percentage: 0 },
  ];

  await supabase.from('offers').insert(offers);
  console.log(`✅ ${offers.length} offers created`);

  // Seed Experiments
  console.log('\n🧪 Seeding experiments...');
  const experiments = [
    {
      name: 'Monthly vs Annual Entry Offer',
      hypothesis: 'Monthly offer will generate higher 90-day reader revenue among medium-high propensity readers.',
      description: 'Comparing monthly Rp64k vs annual Rp299k for readers with propensity 60-80.',
      status: 'RUNNING',
      primary_metric: 'revenue_per_exposed',
      guardrail_metrics: ['churn_rate', 'refund_rate', 'arpu'],
      audience_definition: { propensity_min: 60, propensity_max: 80, subscription_status: ['NONE'] as string[], identity_status: [] as string[] },
      traffic_percentage: 100,
      start_at: daysAgo(7),
    },
    {
      name: 'Registration Wall vs Soft Paywall',
      hypothesis: 'Soft paywall will convert better than registration wall for engaged anonymous readers.',
      description: 'A/B test between registration wall and soft paywall for anonymous readers with propensity 30-60.',
      status: 'RUNNING',
      primary_metric: 'conversion_rate',
      guardrail_metrics: ['pageviews', 'avg_session_duration'],
      audience_definition: { propensity_min: 30, propensity_max: 60, subscription_status: ['NONE'], identity_status: ['ANONYMOUS'] },
      traffic_percentage: 50,
      start_at: daysAgo(14),
    },
    {
      name: 'Annual Promo vs Monthly for High Intent',
      hypothesis: 'High-intent investigative readers prefer annual subscriptions when given the option.',
      description: 'Test annual promo pricing vs monthly for very high propensity readers.',
      status: 'RUNNING',
      primary_metric: 'ltv_90d',
      guardrail_metrics: ['churn_rate', 'time_to_convert'],
      audience_definition: { propensity_min: 80, propensity_max: 100, subscription_status: ['NONE'] as string[], identity_status: [] as string[] },
      traffic_percentage: 100,
      start_at: daysAgo(3),
    },
  ];

  for (const exp of experiments) {
    const { data: createdExp } = await supabase.from('experiments').insert(exp).select().single();
    if (createdExp && 'id' in createdExp) {
      // Create variants
      const variants = [
        { name: 'Control', allocation_percentage: 50 },
        { name: 'Variant A', allocation_percentage: 50 },
      ];
      await supabase.from('experiment_variants').insert(
        variants.map((v) => ({ ...v, experiment_id: (createdExp as { id: string }).id }))
      );
    }
  }
  console.log(`✅ ${experiments.length} experiments created`);

  // Seed Readers in Batches
  console.log('\n👥 Seeding readers...');
  const totalReaders = CONFIG.totalReaders;
  const batchSize = 100;
  let readersCreated = 0;

  // Calculate segment distribution
  const segmentSizes: Array<{ config: SegmentConfig; count: number }> = [];
  for (const seg of SEGMENTS) {
    segmentSizes.push({
      config: seg,
      count: Math.round(seg.weight * totalReaders),
    });
  }

  // Adjust last one to make total match
  const sumSizes = segmentSizes.reduce((s, x) => s + x.count, 0);
  const lastSegment = segmentSizes[segmentSizes.length - 1];
  if (lastSegment) {
    lastSegment.count += totalReaders - sumSizes;
  }

  for (const segItem of segmentSizes) {
    const { config: seg, count } = segItem;
    for (let batch = 0; batch < count; batch += batchSize) {
      const batchCount = Math.min(batchSize, count - batch);
      const readerBatch = [];

      for (let i = 0; i < batchCount; i++) {
        const readerId = uuid();
        const sessions30d = randomInt(seg.sessions30d[0], seg.sessions30d[1], rand);
        const articles30d = randomInt(seg.articles30d[0], seg.articles30d[1], rand);
        const premiumArticles = Math.round(articles30d * seg.premiumRatio);
        const sessions7d = Math.min(sessions30d, randomInt(0, Math.ceil(sessions30d / 4), rand));
        const articles7d = Math.min(articles30d, randomInt(0, Math.ceil(articles30d / 4), rand));
        const avgCompletion = seg.completionRate[0] + rand() * (seg.completionRate[1] - seg.completionRate[0]);
        const paywallViews = randomInt(seg.paywallViews[0], seg.paywallViews[1], rand);
        const offerClicks = randomInt(seg.offerClicks[0], seg.offerClicks[1], rand);
        const checkoutStarts = randomInt(seg.checkoutStarts[0], seg.checkoutStarts[1], rand);
        const propensity = randomInt(seg.propensityRange[0], seg.propensityRange[1], rand);
        const priceSensitivity = randomInt(seg.priceSensitivityRange[0], seg.priceSensitivityRange[1], rand);
        const churnRisk = seg.churnRisk[1] > 0
          ? randomInt(seg.churnRisk[0], seg.churnRisk[1], rand)
          : 0;
        const ltv = randomInt(seg.ltvRange[0], seg.ltvRange[1], rand);

        // Calculate engagement score
        const recencyScore = Math.max(0, 100 - randomInt(0, 10, rand) * 5);
        const frequencyScore = Math.min(100, sessions30d * 3.3);
        const depthScore = 40 + rand() * 50;
        const completionScore = avgCompletion * 100;
        const premiumScore = Math.min(100, premiumArticles * 10);
        const consistencyScore = sessions7d > 0 ? 50 + rand() * 50 : rand() * 30;
        const engagementScore = Math.round(
          (recencyScore * 0.2 + frequencyScore * 0.2 + depthScore * 0.2 +
           completionScore * 0.15 + premiumScore * 0.15 + consistencyScore * 0.1)
        );

        const daysSinceLastVisit = sessions7d > 0 ? randomInt(0, 7, rand) : randomInt(1, 14, rand);

        const anonymousId = `anon_${uuid().substring(0, 8)}`;
        const externalUserId = seg.identityStatus !== 'ANONYMOUS' ? `user_${uuid().substring(0, 8)}` : null;

        readerBatch.push({
          id: readerId,
          anonymous_id: anonymousId,
          external_user_id: externalUserId,
          identity_status: seg.identityStatus,
          subscription_status: seg.subscriptionStatus,
          subscription_started_at: seg.subscriptionStatus === 'ACTIVE' ? daysAgo(randomInt(30, 365, rand)) : null,
          subscription_expires_at: seg.subscriptionStatus === 'ACTIVE' ? daysAgo(-randomInt(30, 365, rand)) : null,
          first_seen_at: daysAgo(randomInt(10, 180, rand)),
          last_seen_at: daysAgo(randomInt(0, Math.min(14, sessions30d * 2), rand)),
        });

        // Reader Features
        await supabase.from('reader_features').insert({
          reader_id: readerId,
          sessions_7d: sessions7d,
          sessions_30d: sessions30d,
          articles_7d: articles7d,
          articles_30d: articles30d,
          premium_articles_30d: premiumArticles,
          avg_scroll_depth: 30 + rand() * 60,
          avg_completion_rate: avgCompletion,
          paywall_views_30d: paywallViews,
          offer_clicks_30d: offerClicks,
          checkout_starts_30d: checkoutStarts,
          days_since_last_visit: daysSinceLastVisit,
          newsletter_signups: rand() > 0.7 ? 1 : 0,
          registrations: seg.identityStatus === 'REGISTERED' || seg.identityStatus === 'KNOWN' ? 1 : 0,
          former_subscriber: seg.subscriptionStatus === 'EXPIRED',
          engagement_score: engagementScore,
          subscription_propensity: propensity,
          price_sensitivity: priceSensitivity,
          content_loyalty: Math.round((engagementScore * (propensity / 100)) * 100) / 100,
          churn_risk: churnRisk,
          predicted_ltv: ltv,
        });

        // Topic Affinities
        const numTopics = randomInt(1, 4, rand);
        const shuffledTopics = [...TOPICS].sort(() => rand() - 0.5).slice(0, numTopics);
        const topicData = shuffledTopics.map((topic, idx) => ({
          reader_id: readerId,
          topic,
          score: Math.round((90 - idx * 15) * rand() + 10),
          article_count: randomInt(2, articles30d, rand),
          last_engaged_at: hoursAgo(randomInt(1, 72, rand)),
        }));
        await supabase.from('reader_topic_affinity').insert(topicData);

        // Events
        const numEvents = randomInt(CONFIG.eventsPerReader.min, CONFIG.eventsPerReader.max, rand);
        const eventBatch = [];

        for (let e = 0; e < numEvents; e++) {
          const sessionId = `ses_${uuid().substring(0, 12)}`;
          const article = randomChoice(articles, rand);
          const hoursBack = randomInt(1, 720, rand);
          const eventNames = ['page_view', 'article_view', 'article_start'];
          if (rand() > 0.3) eventNames.push('scroll_50', 'scroll_75');
          if (rand() > 0.5) eventNames.push('article_complete');
          if (article.is_premium && rand() > 0.6) eventNames.push('paywall_view');
          if (offerClicks > 0 && rand() > 0.7) eventNames.push('subscription_offer_click');
          if (checkoutStarts > 0 && rand() > 0.8) eventNames.push('checkout_start');

          const eventName = randomChoice(eventNames, rand);
          eventBatch.push({
            id: uuid(),
            event_id: `evt_${uuid()}`,
            reader_id: readerId,
            anonymous_id: anonymousId,
            session_id: sessionId,
            event_name: eventName,
            article_id: article.id,
            timestamp: hoursAgo(hoursBack),
            source: randomChoice(['web', 'app', 'api'], rand),
            metadata: JSON.stringify({
              category: article.category,
              topic: article.topic,
              premium: article.is_premium,
              source: randomChoice(SESSION_IDS, rand),
            }),
          });
        }

        if (eventBatch.length > 0) {
          for (let eb = 0; eb < eventBatch.length; eb += 50) {
            await supabase.from('events').insert(eventBatch.slice(eb, eb + 50));
          }
        }
      }

      if (readerBatch.length > 0) {
        await supabase.from('readers').insert(readerBatch);
      }

      readersCreated += batchCount;
      if (readersCreated % 500 === 0) {
        process.stdout.write(`\r  📊 Progress: ${readersCreated}/${totalReaders} readers...`);
      }
    }
  }

  console.log(`\n✅ ${readersCreated} readers created with features, topic affinities, and events`);

  // Seed Opportunities
  console.log('\n🎯 Seeding opportunities...');
  const opportunities = [
    {
      type: 'high_propensity_generic_offer',
      title: 'High-propensity readers receiving generic treatment',
      description: 'Thousands of high-propensity readers are receiving free access instead of subscription offers.',
      severity: 'HIGH',
      status: 'DETECTED',
      estimated_audience: Math.round(readersCreated * 0.08),
      estimated_incremental_revenue: Math.round(readersCreated * 0.08 * 290000 * 0.03),
      recommended_action: 'Test personalized monthly vs annual offer for high-propensity readers',
      supporting_metrics: { conversion_rate: 0.023, avg_propensity: 72 },
      detected_at: hoursAgo(2),
    },
    {
      type: 'high_churn_population',
      title: 'Subscribers at high churn risk',
      description: 'Thousands of active subscribers show declining engagement patterns.',
      severity: 'CRITICAL',
      status: 'DETECTED',
      estimated_audience: Math.round(readersCreated * 0.05),
      estimated_incremental_revenue: Math.round(readersCreated * 0.05 * 290000 * 0.3),
      recommended_action: 'Launch retention/save journey with personalized offers',
      supporting_metrics: { avg_churn_risk: 82, revenue_at_risk: 0 },
      detected_at: hoursAgo(5),
    },
    {
      type: 'traffic_spike',
      title: 'Politics traffic surge — monetization opportunity',
      description: 'Politics article traffic is 4.2x above baseline. High-propensity readers not being monetized.',
      severity: 'MEDIUM',
      status: 'DETECTED',
      estimated_audience: Math.round(readersCreated * 0.15),
      estimated_incremental_revenue: Math.round(readersCreated * 0.15 * 50000 * 0.02),
      recommended_action: 'Activate contextual subscription treatment for politics readers',
      supporting_metrics: { lift: 4.2, baseline: 12000, current: 50400 },
      detected_at: hoursAgo(1),
    },
    {
      type: 'checkout_abandonment_spike',
      title: 'High checkout abandonment rate',
      description: 'Checkout abandonment rate at 62%. Significant friction in subscription flow.',
      severity: 'HIGH',
      status: 'INVESTIGATING',
      estimated_audience: Math.round(readersCreated * 0.03),
      estimated_incremental_revenue: Math.round(readersCreated * 0.03 * 150000 * 0.15),
      recommended_action: 'Test simplified checkout and offer variants',
      supporting_metrics: { abandonment_rate: 0.62, checkout_starts: 1240, completes: 471 },
      detected_at: hoursAgo(8),
    },
  ];

  await supabase.from('opportunities').insert(opportunities);
  console.log(`✅ ${opportunities.length} opportunities created`);

  // Seed Decisions for recent high-propensity readers
  console.log('\n🧠 Seeding decisions...');
  const { data: highPropReaders } = await supabase
    .from('reader_features')
    .select('reader_id, subscription_propensity, price_sensitivity, engagement_score, content_loyalty, churn_risk, predicted_ltv')
    .gte('subscription_propensity', 60)
    .limit(500);

  const decisionBatch = [];
  for (const rf of highPropReaders ?? []) {
    let action = 'SHOW_REGISTRATION';
    if (rf.subscription_propensity >= 80 && rf.price_sensitivity < 40) action = 'SHOW_ANNUAL';
    else if (rf.subscription_propensity >= 60 && rf.price_sensitivity >= 65) action = 'SHOW_TRIAL';
    else if (rf.subscription_propensity >= 60) action = 'SHOW_MONTHLY';

    decisionBatch.push({
      reader_id: rf.reader_id,
      context: JSON.stringify({ article_id: null, session_id: `ses_${uuid().substring(0, 8)}` }),
      selected_action: action,
      score_snapshot: JSON.stringify({
        engagement_score: rf.engagement_score,
        subscription_propensity: rf.subscription_propensity,
        price_sensitivity: rf.price_sensitivity,
        content_loyalty: rf.content_loyalty,
        churn_risk: rf.churn_risk,
        predicted_ltv: rf.predicted_ltv,
      }),
      reason_codes: JSON.stringify(
        rf.subscription_propensity >= 80
          ? ['VERY_HIGH_SUBSCRIPTION_PROPENSITY', 'LOW_PRICE_SENSITIVITY', 'HIGH_ENGAGEMENT']
          : rf.subscription_propensity >= 60
            ? ['HIGH_SUBSCRIPTION_PROPENSITY', 'HIGH_ENGAGEMENT']
            : ['MEDIUM_SUBSCRIPTION_PROPENSITY']
      ),
      decision_version: 'rules-v1',
      confidence: 0.7 + rand() * 0.25,
      execution_mode: 'LIVE',
      expected_value: rf.predicted_ltv * (0.7 + rand() * 0.25),
      timestamp: hoursAgo(randomInt(1, 72, rand)),
    });
  }

  for (let i = 0; i < decisionBatch.length; i += 50) {
    await supabase.from('decisions').insert(decisionBatch.slice(i, i + 50));
  }
  console.log(`✅ ${decisionBatch.length} decisions created`);

  // Seed News Moments
  console.log('\n📰 Seeding news moments...');
  const newsMoments = [
    {
      topic: 'Politics',
      category: 'Politik',
      baseline_traffic: 4000,
      current_traffic: 28000,
      traffic_lift_percentage: 600,
      new_readers: 12000,
      returning_readers: 16000,
      high_propensity_readers: 8400,
      estimated_incremental_revenue: 28000000,
      severity: 'HIGH',
      status: 'ACTIVE',
      detected_at: hoursAgo(3),
    },
    {
      topic: 'Investigation',
      category: 'Investigasi',
      baseline_traffic: 2000,
      current_traffic: 14000,
      traffic_lift_percentage: 600,
      new_readers: 8000,
      returning_readers: 6000,
      high_propensity_readers: 5600,
      estimated_incremental_revenue: 18000000,
      severity: 'MEDIUM',
      status: 'ACTIVE',
      detected_at: hoursAgo(6),
    },
    {
      topic: 'Economy',
      category: 'Ekonomi',
      baseline_traffic: 8000,
      current_traffic: 22000,
      traffic_lift_percentage: 175,
      new_readers: 9000,
      returning_readers: 13000,
      high_propensity_readers: 8800,
      estimated_incremental_revenue: 22000000,
      severity: 'MEDIUM',
      status: 'ACTIVE',
      detected_at: hoursAgo(1),
    },
  ];

  await supabase.from('news_moments').insert(newsMoments);
  console.log(`✅ ${newsMoments.length} news moments created`);

  // Seed Conversions
  console.log('\n💳 Seeding conversions...');
  const { data: activeSubs } = await supabase
    .from('readers')
    .select('id')
    .eq('subscription_status', 'ACTIVE')
    .limit(300);

  const conversionBatch = [];
  for (const sub of activeSubs ?? []) {
    const revenue = randomChoice([64000, 299000, 199000, 19000], rand);
    conversionBatch.push({
      reader_id: sub.id,
      conversion_type: 'subscription',
      revenue,
      occurred_at: daysAgo(randomInt(1, 30, rand)),
    });
  }

  for (let i = 0; i < conversionBatch.length; i += 50) {
    await supabase.from('conversions').insert(conversionBatch.slice(i, i + 50));
  }
  console.log(`✅ ${conversionBatch.length} conversions created`);

  console.log('\n🎉 Seed complete!');
  console.log(`📊 Summary:`);
  console.log(`   - ${readersCreated} readers`);
  console.log(`   - ${articles.length} articles`);
  console.log(`   - ${experiments.length} experiments`);
  console.log(`   - ${opportunities.length} opportunities`);
  console.log(`   - ${decisionBatch.length} decisions`);
  console.log(`   - ${conversionBatch.length} conversions`);
}

seed().catch(console.error);
