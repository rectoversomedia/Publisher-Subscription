/**
 * Smoke Tests — Tempo Reader Revenue Brain
 * Run with: node tests/smoke.test.js
 *
 * Tests critical user flows without requiring a full test runner.
 * Each test logs PASS/FAIL and exits non-zero on failure.
 */

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SB_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    timeout: 15000,
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// ── Dashboard KPI ─────────────────────────────────────────────────────────────

async function testDashboardKPIs() {
  console.log('\n[1] GET /api/dashboard');
  const { status, ok, data } = await fetchJson(`${BASE}/api/dashboard`);
  assert(status === 200, 'Status 200');
  assert(ok, 'Response ok');
  assert(Array.isArray(data.kpis), 'kpis is an array');
  if (Array.isArray(data.kpis) && data.kpis.length > 0) {
    const kpi = data.kpis[0];
    assert(typeof kpi.value === 'number', `KPI value is number (got: ${typeof kpi.value})`);
    assert(!isNaN(kpi.value), 'KPI value is not NaN');
  }
}

// ── Readers ───────────────────────────────────────────────────────────────────

async function testReadersAPI() {
  console.log('\n[2] GET /api/v1/readers');
  const { status, data } = await fetchJson(`${BASE}/api/v1/readers?limit=5`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
  if (Array.isArray(data.data) && data.data.length > 0) {
    const r = data.data[0];
    assert(r.id && typeof r.id === 'string', 'Reader has id');
    assert(r.subscription_status, 'Reader has subscription_status');
  }
}

// ── Reader Detail ─────────────────────────────────────────────────────────────

async function testReaderDetail() {
  console.log('\n[3] GET /api/v1/readers/:id');
  // First fetch a reader ID
  const { data: listData } = await fetchJson(`${BASE}/api/v1/readers?limit=1`);
  const readers = listData?.data ?? [];
  if (readers.length === 0) {
    console.log('  ⚠ No readers in DB — skipping reader detail test');
    return;
  }
  const id = readers[0].id;
  const { status, data } = await fetchJson(`${BASE}/api/v1/readers/${id}`);
  assert(status === 200, 'Status 200');
  assert(data.id === id, `Returns correct reader (${id.slice(0, 8)}…)`);
}

// ── Decisions ─────────────────────────────────────────────────────────────────

async function testDecisionsAPI() {
  console.log('\n[4] GET /api/v1/decisions');
  const { status, data } = await fetchJson(`${BASE}/api/v1/decisions?limit=5`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
}

// ── Experiments ───────────────────────────────────────────────────────────────

async function testExperimentsAPI() {
  console.log('\n[5] GET /api/v1/experiments');
  const { status, data } = await fetchJson(`${BASE}/api/v1/experiments`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
}

// ── Opportunities ─────────────────────────────────────────────────────────────

async function testOpportunitiesAPI() {
  console.log('\n[6] GET /api/v1/opportunities');
  const { status, data } = await fetchJson(`${BASE}/api/v1/opportunities`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
  assert(typeof data.summary === 'object', 'summary is an object');
}

// ── Content Metrics ───────────────────────────────────────────────────────────

async function testContentMetricsAPI() {
  console.log('\n[7] GET /api/content-metrics');
  const { status, data } = await fetchJson(`${BASE}/api/content-metrics?limit=5`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
}

// ── News Moments ───────────────────────────────────────────────────────────────

async function testNewsMomentsAPI() {
  console.log('\n[8] GET /api/news-moments');
  const { status, data } = await fetchJson(`${BASE}/api/news-moments`);
  assert(status === 200, 'Status 200');
  assert(Array.isArray(data.data), 'data.data is an array');
}

// ── Copilot ───────────────────────────────────────────────────────────────────

async function testCopilotAPI() {
  console.log('\n[9] POST /api/copilot/query — getConversionRate');
  const { status, data } = await fetchJson(`${BASE}/api/copilot/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'getConversionRate' }),
  });
  assert(status === 200, 'Status 200');
  assert(data.count !== undefined, 'Response has count field');
  assert(typeof data.count === 'number', 'count is a number');
}

// ── Config ─────────────────────────────────────────────────────────────────────

async function testConfigAPI() {
  console.log('\n[10] GET /api/config');
  const { status, data } = await fetchJson(`${BASE}/api/config`);
  assert(status === 200, 'Status 200');
  assert(data.data && typeof data.data === 'object', 'config has data object');
}

// ── Events ─────────────────────────────────────────────────────────────────────

async function testEventsAPI() {
  console.log('\n[11] POST /api/v1/events');
  const { status } = await fetchJson(`${BASE}/api/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_name: 'smoke_test',
      reader_id: 'smoke-test-reader',
      session_id: 'smoke-test-session',
      article_id: 'smoke-test-article',
      properties: { test: true },
    }),
  });
  assert(status === 200 || status === 201, `Status ${status} (accepted)`);
}

// ── Dashboard Page ─────────────────────────────────────────────────────────────

async function testDashboardPage() {
  console.log('\n[12] GET /dashboard');
  const { status } = await fetchJson(`${BASE}/dashboard`);
  assert(status === 200, `Dashboard page returns ${status}`);
}

// ── Run All ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Tempo Reader Revenue Brain — Smoke Tests');
  console.log(`  Base URL: ${BASE}`);
  console.log('═══════════════════════════════════════════════');

  try {
    await testDashboardKPIs();
    await testReadersAPI();
    await testReaderDetail();
    await testDecisionsAPI();
    await testExperimentsAPI();
    await testOpportunitiesAPI();
    await testContentMetricsAPI();
    await testNewsMomentsAPI();
    await testCopilotAPI();
    await testConfigAPI();
    await testEventsAPI();
    await testDashboardPage();
  } catch (err) {
    console.error('\nUnexpected error during test run:', err.message);
    failed++;
  }

  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main();
