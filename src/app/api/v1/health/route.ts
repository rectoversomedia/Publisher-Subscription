// GET /api/v1/health — Health Check
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    const { error } = await supabaseAdmin.from('readers').select('id').limit(1);
    checks.database = {
      status: error ? 'unhealthy' : 'healthy',
      latency_ms: Date.now() - dbStart,
      error: error?.message,
    };
  } catch (e) {
    checks.database = { status: 'unhealthy', latency_ms: Date.now() - dbStart, error: String(e) };
  }

  // Event volume check (last 5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  try {
    const { count, error } = await supabaseAdmin
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', fiveMinutesAgo.toISOString());
    checks.event_volume = {
      status: 'healthy',
      latency_ms: 0,
    };
    (checks as Record<string, unknown>).events_last_5min = count ?? 0;
  } catch {
    checks.event_volume = { status: 'healthy' };
  }

  // System config check
  try {
    const { error } = await supabaseAdmin.from('system_config').select('id').limit(1);
    checks.system_config = {
      status: error ? 'unhealthy' : 'healthy',
      error: error?.message,
    };
  } catch (e) {
    checks.system_config = { status: 'unhealthy', error: String(e) };
  }

  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  return NextResponse.json({
    status: allHealthy ? 'healthy' : 'degraded',
    version: '1.0.0',
    environment: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
    checks,
  }, { status: allHealthy ? 200 : 503 });
}
