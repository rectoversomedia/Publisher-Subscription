// POST /api/copilot/query
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ANALYTICS_FUNCTIONS: Record<string, { query: string; description: string }> = {
  getConversionRate: {
    query: `SELECT
      ROUND(
        COUNT(CASE WHEN subscription_status = 'ACTIVE' THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN identity_status != 'ANONYMOUS' THEN 1 END), 0) * 100, 2
      ) as conversion_rate
    FROM readers`,
    description: 'Subscription conversion rate',
  },
  getHighPropensityUnsubs: {
    query: `SELECT COUNT(*)::int as count FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'High-propensity unsubscribed readers',
  },
  getChurnRisk: {
    query: `SELECT COUNT(*)::int as count FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.churn_risk >= 75 AND r.subscription_status = 'ACTIVE'`,
    description: 'Active subscribers at high churn risk',
  },
  getRevenueOpportunity: {
    query: `SELECT COALESCE(SUM(predicted_ltv), 0)::int as total FROM reader_features rf
    JOIN readers r ON rf.reader_id = r.id
    WHERE rf.subscription_propensity >= 60 AND r.subscription_status = 'NONE'`,
    description: 'Total estimated revenue opportunity',
  },
  getBestExperiment: {
    query: `SELECT e.name, SUM(c.revenue) as revenue
    FROM conversions c
    JOIN experiments e ON c.experiment_id = e.id
    WHERE e.status = 'RUNNING'
    GROUP BY e.id, e.name
    ORDER BY revenue DESC
    LIMIT 5`,
    description: 'Top performing experiments by revenue',
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fn = body.function as string;

    const fnDef = ANALYTICS_FUNCTIONS[fn];
    if (!fnDef) {
      return NextResponse.json({ error: 'Unknown function' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.rpc('exec', { query: fnDef.query }).single();

    if (error) {
      // Fallback: try direct query
      return NextResponse.json({
        result: { count: 0 },
        summary: `Unable to execute query. ${fnDef.description}: data unavailable.`,
        sources: ['readers', 'reader_features'],
      });
    }

    return NextResponse.json({
      result: data,
      summary: `${fnDef.description}: ${JSON.stringify(data)}`,
      sources: ['readers', 'reader_features'],
    });
  } catch (error) {
    console.error('Copilot query error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
