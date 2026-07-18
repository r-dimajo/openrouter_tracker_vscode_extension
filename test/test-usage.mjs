import 'dotenv/config';

const API_KEY = process.env.OPENROUTER_API_KEY;
const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE = 'https://openrouter.ai/api/v1';

async function fetchJSON(endpoint) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  const headers = Object.fromEntries(res.headers.entries());
  return { data, headers };
}

// ── 1. Key usage — the single endpoint that has everything ─────────────
async function getKeyUsage() {
  const { data, headers } = await fetchJSON('/key');
  const d = data.data;

  console.log('\n══════════════════════════════════════════════');
  console.log('  🔑 API KEY INFO');
  console.log('══════════════════════════════════════════════');
  console.log(`  Label:              ${d.label ?? '(no label)'}`);
  console.log(`  Free tier:          ${d.is_free_tier}`);
  console.log('');

  console.log('  ── Usage (credits) ──');
  console.log(`  All time:           $${d.usage?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This month (UTC):   $${d.usage_monthly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This week (UTC):    $${d.usage_weekly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  Today (UTC):        $${d.usage_daily?.toFixed(6) ?? 'N/A'}`);
  console.log('');

  console.log('  ── BYOK Usage (external keys) ──');
  console.log(`  All time:           $${d.byok_usage?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This month (UTC):   $${d.byok_usage_monthly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This week (UTC):    $${d.byok_usage_weekly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  Today (UTC):        $${d.byok_usage_daily?.toFixed(6) ?? 'N/A'}`);
  console.log('');

  console.log('  ── Credit Limits (Guardrails) ──');
  console.log(`  Credit limit:       ${d.limit ?? 'No limit set'} $`);
  console.log(`  Limit remaining:    ${d.limit_remaining ?? 'N/A'} $`);
  console.log(`  Limit reset:        ${d.limit_reset ?? 'Never resets'}`);
  console.log(`  Include BYOK:       ${d.include_byok_in_limit}`);
  console.log('');

  // Rate-limit headers (only present on 429 errors, but show if available)
  const rlHeaders = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.startsWith('x-ratelimit') || k.startsWith('x-remaining') || k.startsWith('retry-after')) {
      rlHeaders[k] = v;
    }
  }
  if (Object.keys(rlHeaders).length > 0) {
    console.log('  ── Rate-Limit Headers ──');
    for (const [k, v] of Object.entries(rlHeaders)) {
      console.log(`  ${k}: ${v}`);
    }
  } else {
    console.log('  (Rate-limit headers only appear on 429 responses)');
  }

  return d;
}

// ── Helper: next reset date ────────────────────────────────────────────
function nextReset(interval) {
  const now = new Date();
  switch (interval) {
    case 'daily':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
    case 'weekly': {
      // Next Monday 00:00 UTC
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
    }
    case 'monthly':
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    default:
      return null;
  }
}

function formatDate(d) {
  if (!d) return 'Never';
  return d.toISOString().replace('T', ' ').replace(/\.\d+Z/, ' UTC');
}

function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

// ── 2. Guardrails — requires a Management Key ─────────────────────────
async function getGuardrails() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  🛡️  GUARDRAILS');
  console.log('══════════════════════════════════════════════');

  const res = await fetch(`${BASE}/guardrails`, {
    headers: { Authorization: `Bearer ${MGMT_KEY}` },
  });

  if (res.status === 401) {
    console.log('  ⚠️  Management Key is invalid or missing');
    console.log('  → Check your OPENROUTER_MANAGEMENT_KEY in .env');
    return null;
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }

  const body = await res.json();

  for (const g of body.data ?? []) {
    console.log(`  ── ${g.name} ──`);
    console.log(`  ID:              ${g.id}`);
    console.log(`  Description:     ${g.description ?? '(none)'}`);
    console.log(`  Limit (USD):     ${g.limit_usd ?? 'No limit'} $`);
    console.log(`  Reset interval:  ${g.reset_interval ?? 'Never'}`);
    console.log(`  Allowed models:  ${g.allowed_models?.join(', ') ?? 'All'}`);
    console.log(`  Allowed providers: ${g.allowed_providers?.join(', ') ?? 'All'}`);
    console.log(`  Ignored models:  ${g.ignored_models?.join(', ') ?? 'None'}`);
    console.log(`  Ignored providers: ${g.ignored_providers?.join(', ') ?? 'None'}`);
    console.log(`  ZDR (Anthropic): ${g.enforce_zdr_anthropic ?? false}`);
    console.log(`  ZDR (OpenAI):    ${g.enforce_zdr_openai ?? false}`);
    console.log(`  ZDR (Google):    ${g.enforce_zdr_google ?? false}`);
    console.log(`  Content filters: ${g.content_filters?.length ?? 0} custom, ${g.content_filter_builtins?.length ?? 0} built-in`);
    console.log(`  Created:         ${g.created_at}`);
    console.log(`  Updated:         ${g.updated_at ?? 'never'}`);
    console.log('');
  }

  if (!body.data?.length) {
    console.log('  (no guardrails configured)');
  }

  console.log(`  Total guardrails: ${body.total_count ?? 0}`);
  return body;
}

// ── 3. Budget tracking — combines guardrail limit + usage ──────────────
async function getBudgetTracking(guardrailsBody) {
  // Fetch fresh usage
  const { data } = await fetchJSON('/key');
  const usage = data.data;

  // Find the first guardrail with a limit
  const guardrail = guardrailsBody?.data?.find(g => g.limit_usd != null);
  if (!guardrail) {
    console.log('\n══════════════════════════════════════════════');
    console.log('  📊 BUDGET TRACKING');
    console.log('══════════════════════════════════════════════');
    console.log('  No guardrail with a spending limit found.');
    return;
  }

  const limit = guardrail.limit_usd;
  const interval = guardrail.reset_interval;
  const spent = usage.usage_monthly ?? 0;
  const remaining = Math.max(0, limit - spent);
  const pct = (spent / limit) * 100;
  const resetDate = nextReset(interval);
  const days = daysUntil(resetDate);

  console.log('\n══════════════════════════════════════════════');
  console.log('  📊 BUDGET TRACKING');
  console.log('══════════════════════════════════════════════');
  console.log(`  Guardrail:       ${guardrail.name}`);
  console.log(`  Monthly limit:   $${limit.toFixed(2)}`);
  console.log(`  Spent this month: $${spent.toFixed(6)}`);
  console.log(`  Remaining:       $${remaining.toFixed(6)}`);
  console.log(`  Used:            ${pct.toFixed(2)}%`);
  console.log(`  Remaining:       ${(100 - pct).toFixed(2)}%`);

  // Visual bar
  const barLen = 20;
  const filled = Math.round((pct / 100) * barLen);
  const bar = '█'.repeat(Math.min(filled, barLen)) + '░'.repeat(Math.max(0, barLen - filled));
  console.log(`  ${bar}  ${pct.toFixed(1)}%`);

  console.log('');
  console.log(`  Next reset:      ${formatDate(resetDate)}`);
  console.log(`  Days until reset: ${days ?? 'N/A'}`);
  console.log(`  Reset interval:  ${interval}`);
  console.log(`  Avg daily spend: $${(spent / Math.max(1, 30 - (days ?? 0))).toFixed(6)}`);
  console.log(`  Projected monthly: $${((spent / Math.max(1, 30 - (days ?? 0))) * 30).toFixed(6)}`);
}

// ── 4. Model breakdown — Analytics API (requires Management Key) ───────
async function getModelBreakdown() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  📦 MODEL BREAKDOWN (this month)');
  console.log('══════════════════════════════════════════════');

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();

  const res = await fetch(`${BASE}/analytics/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MGMT_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      metrics: ['total_usage', 'request_count', 'tokens_total', 'cache_hit_rate'],
      dimensions: ['model'],
      order_by: { field: 'total_usage', direction: 'desc' },
      time_range: { start: monthStart, end: monthEnd },
      limit: 20,
    }),
  });

  if (res.status === 401) {
    console.log('  ⚠️  Analytics API requires a Management Key');
    return;
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }

  const body = await res.json();
  const rows = body.data?.data ?? [];

  if (!rows.length) {
    console.log('  (no usage data for this month)');
    return;
  }

  // Compute total for percentages
  const totalUsage = rows.reduce((s, r) => s + r.total_usage, 0);

  // Header
  console.log('  Model'.padEnd(45) + 'Cost'.padStart(12) + '%'.padStart(8) + 'Req'.padStart(6) + 'Tokens'.padStart(12) + 'Cache'.padStart(8));
  console.log('  ' + '─'.repeat(88));

  for (const r of rows) {
    const model = r.model.length > 42 ? r.model.slice(0, 39) + '…' : r.model;
    const cost = `$${r.total_usage.toFixed(6)}`;
    const pct = ((r.total_usage / totalUsage) * 100).toFixed(1) + '%';
    const reqs = r.request_count?.toString() ?? '0';
    const tokens = r.tokens_total ? (parseInt(r.tokens_total) / 1000).toFixed(0) + 'k' : '0';
    const cache = r.cache_hit_rate != null ? (r.cache_hit_rate * 100).toFixed(0) + '%' : '-';

    console.log(`  ${model.padEnd(45)}${cost.padStart(12)}${pct.padStart(8)}${reqs.padStart(6)}${tokens.padStart(12)}${cache.padStart(8)}`);
  }

  console.log('  ' + '─'.repeat(88));

  // Summary
  const totalTokens = rows.reduce((s, r) => s + parseInt(r.tokens_total || '0'), 0);
  const totalReqs = rows.reduce((s, r) => s + parseInt(r.request_count || '0'), 0);
  const blendedRate = totalTokens > 0 ? (totalUsage / totalTokens * 1_000_000).toFixed(2) : 'N/A';
  console.log(`  TOTAL`.padEnd(45) + `$${totalUsage.toFixed(6)}`.padStart(12) + `100%`.padStart(8) + `${totalReqs}`.padStart(6) + `${(totalTokens/1000).toFixed(0)}k`.padStart(12));
  console.log(`  Blended rate: $${blendedRate}/M tok`);
  console.log(`  Query time: ${body.data?.metadata?.query_time_ms ?? '?'}ms  |  ${rows.length} models`);
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  OPENROUTER API USAGE REPORT');
  console.log(`  ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════');

  try {
    await getKeyUsage();
  } catch (e) {
    console.error('\n❌ Failed:', e.message);
  }

  let guardrailsData;
  try {
    guardrailsData = await getGuardrails();
  } catch (e) {
    console.error('\n❌ Guardrails failed:', e.message);
  }

  try {
    await getBudgetTracking(guardrailsData);
  } catch (e) {
    console.error('\n❌ Budget tracking failed:', e.message);
  }

  try {
    await getModelBreakdown();
  } catch (e) {
    console.error('\n❌ Model breakdown failed:', e.message);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('  ✅ Done');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(console.error);