import 'dotenv/config';
import * as readline from 'node:readline';

const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE     = 'https://openrouter.ai/api/v1';

// ── Presets ────────────────────────────────────────────────────────────
const PRESET_DIMENSIONS = ['model', 'api_key_id', 'user'];
const PRESET_METRICS    = [
  'request_count',
  'total_usage',
  'credits_usage',
  'openrouter_usage',
];

// ── Helpers ────────────────────────────────────────────────────────────
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(q, ans => { rl.close(); resolve(ans.trim()); }));
}

async function fetchJSON(endpoint, init = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${MGMT_KEY}`, 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const text = await res.text();
  if (!res.ok) {
    let detail = text;
    try { detail = JSON.stringify(JSON.parse(text), null, 2); } catch {}
    throw new Error(`${res.status} ${res.statusText}\n${detail}`);
  }
  return JSON.parse(text);
}

// ── Time range helpers ─────────────────────────────────────────────────
function timeRangeForGranularity(gran) {
  const now = new Date();
  const end = now.toISOString();
  let start;
  switch (gran) {
    case 'minute': start = new Date(now - 24 * 60 * 60 * 1000); break;
    case 'hour':   start = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
    case 'day':    start = new Date(now - 30 * 24 * 60 * 60 * 1000); break;
    case 'week':   start = new Date(now - 84 * 24 * 60 * 60 * 1000); break;
    case 'month':  start = new Date(now - 365 * 24 * 60 * 60 * 1000); break;
    default:       start = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }
  return { start: start.toISOString(), end };
}

function formatMetricValue(val, meta) {
  if (val == null || val === '') return '—';
  switch (meta.display_format) {
    case 'currency':  return `$${Number(val).toFixed(4)}`;
    case 'percent':   return `${(Number(val) * 100).toFixed(1)}%`;
    case 'latency':   return `${Number(val).toFixed(0)}ms`;
    case 'throughput':return `${Number(val).toFixed(1)}/s`;
    default:          return typeof val === 'number' ? val.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(val);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════

async function fetchMeta() {
  const { data } = await fetchJSON('/analytics/meta');
  return data;
}

async function listKeys() {
  const body = await fetchJSON('/keys');
  if (!body.data?.length) throw new Error('No API keys found.');
  return body.data;
}

async function getKeyDetail(hash) {
  const { data } = await fetchJSON(`/keys/${hash}`);
  return data;
}

async function runAnalytics({ keyHash, metrics, dimensions, granularity, timeRange }) {
  const body = { metrics, granularity, time_range: timeRange, limit: 1000 };
  if (dimensions.length > 0) body.dimensions = dimensions;
  if (keyHash) body.filters = [{ field: 'api_key_id', operator: 'eq', value: keyHash }];
  const { data } = await fetchJSON('/analytics/query', { method: 'POST', body: JSON.stringify(body) });
  return data;
}

async function listGuardrails() {
  const body = await fetchJSON('/guardrails');
  return body.data ?? [];
}

async function listGuardrailKeyAssignments(guardrailId) {
  const body = await fetchJSON(`/guardrails/${guardrailId}/assignments/keys`);
  return body.data ?? [];
}

async function listWorkspaces() {
  const body = await fetchJSON('/workspaces');
  return body.data ?? [];
}

// ═══════════════════════════════════════════════════════════════════════
//  DISPLAY
// ═══════════════════════════════════════════════════════════════════════

function displayTable(rows, metricsMeta, chosenMetrics, chosenDimensions, granularity) {
  if (!rows?.length) { console.log('\n   ⚠️  No data.'); return; }

  const dateCol = `created_at__${granularity}`;
  const hasDate = rows[0]?.[dateCol] != null;
  const fmtMap = Object.fromEntries(metricsMeta.map(m => [m.name, m]));

  const cols = [];
  if (hasDate) cols.push({ name: 'Date', key: dateCol, width: 12 });
  for (const d of chosenDimensions) cols.push({ name: d, key: d, width: Math.max(d.length, 14) });
  for (const m of chosenMetrics) cols.push({ name: m, key: m, width: Math.max(fmtMap[m]?.display_label?.length ?? m.length, 14), meta: fmtMap[m] });

  const header = cols.map(c => c.name.padEnd(c.width)).join(' │ ');
  console.log('\n   ' + header);
  console.log('   ' + '─'.repeat(header.length));

  for (const row of rows) {
    const cells = cols.map(c => {
      if (c.name === 'Date') { const v = row[c.key]; return (v ? v.slice(0, 10) : '—').padEnd(c.width); }
      const raw = row[c.key];
      return (c.meta ? formatMetricValue(raw, c.meta) : String(raw ?? '—')).padEnd(c.width);
    });
    console.log('   ' + cells.join(' │ '));
  }
  console.log(`\n   📊 ${rows.length} rows`);
}

// ═══════════════════════════════════════════════════════════════════════
//  MENU: Key Overview
// ═══════════════════════════════════════════════════════════════════════

async function showKeyOverview(key) {
  // Fetch full detail via /keys/{hash}
  let detail;
  try { detail = await getKeyDetail(key.hash); } catch { detail = key; }

  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  🔑 KEY: ${detail.name}`);
  console.log(`${'═'.repeat(62)}`);
  console.log(`  Label:         ${detail.label}`);
  console.log(`  Hash:          ${detail.hash.slice(0, 16)}...`);
  console.log(`  Disabled:      ${detail.disabled}`);
  console.log(`  Workspace:     ${detail.workspace_id ?? '—'}`);
  console.log(`  Created:       ${detail.created_at?.slice(0, 10) ?? '?'}`);
  if (detail.expires_at) console.log(`  Expires:       ${detail.expires_at?.slice(0, 10)}`);

  console.log('');
  console.log('  ── Usage ──');
  console.log(`  All time:      $${detail.usage?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This month:    $${detail.usage_monthly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  This week:     $${detail.usage_weekly?.toFixed(6) ?? 'N/A'}`);
  console.log(`  Today:         $${detail.usage_daily?.toFixed(6) ?? 'N/A'}`);

  console.log('');
  console.log('  ── Key-level Limit ──');
  if (detail.limit != null) {
    console.log(`  Limit:         $${detail.limit.toFixed(2)}`);
    console.log(`  Remaining:     $${detail.limit_remaining?.toFixed(2) ?? 'N/A'}`);
    console.log(`  Reset:         ${detail.limit_reset ?? 'never'}`);
    console.log(`  Includes BYOK: ${detail.include_byok_in_limit ?? false}`);
  } else {
    console.log('  (no key-level limit set)');
  }

  if (detail.byok_usage > 0) {
    console.log('');
    console.log('  ── BYOK ──');
    console.log(`  All time:      $${detail.byok_usage?.toFixed(6)}`);
    console.log(`  This month:    $${detail.byok_usage_monthly?.toFixed(6)}`);
  }

  return detail;
}

// ═══════════════════════════════════════════════════════════════════════
//  MENU: Analytics
// ═══════════════════════════════════════════════════════════════════════

async function analyticsMenu(keyHash, meta, keyName) {
  // 1. Dimensions
  console.log('\n   ── Dimensions ──');
  console.log('   Presets:');
  PRESET_DIMENSIONS.forEach((d, i) => console.log(`   [${i + 1}] ${d}`));
  const allDims = meta.dimensions.map(d => d.name);
  const dimAns = await ask('\n   Comma-separated numbers (1-3) or Enter for all presets, "0" for none: ');
  let chosenDimensions;
  if (dimAns === '0') {
    chosenDimensions = [];
  } else if (dimAns) {
    chosenDimensions = dimAns.split(',').map(n => PRESET_DIMENSIONS[parseInt(n.trim()) - 1]).filter(Boolean);
  } else {
    chosenDimensions = [...PRESET_DIMENSIONS];
  }
  console.log(`   → [${chosenDimensions.join(', ') || 'none'}]`);

  // 2. Metrics
  console.log('\n   ── Metrics ──');
  console.log('   Presets:');
  PRESET_METRICS.forEach((m, i) => console.log(`   [${i + 1}] ${m}`));
  const metAns = await ask('\n   Comma-separated numbers or Enter for presets, "all" for everything: ');
  let chosenMetrics;
  if (metAns.toLowerCase() === 'all') {
    console.log('\n   All metrics:');
    meta.metrics.forEach((m, i) => console.log(`   [${i + 1}] ${m.display_label} (${m.name}) [${m.display_format}]${m.is_rate ? ' ⚡rate' : ''}`));
    const customAns = await ask('\n   Comma-separated numbers or Enter for ALL: ');
    if (customAns) {
      chosenMetrics = customAns.split(',').map(n => meta.metrics[parseInt(n.trim()) - 1]?.name).filter(Boolean);
    } else {
      chosenMetrics = meta.metrics.map(m => m.name);
    }
  } else if (metAns) {
    chosenMetrics = metAns.split(',').map(n => PRESET_METRICS[parseInt(n.trim()) - 1]).filter(Boolean);
  } else {
    chosenMetrics = [...PRESET_METRICS];
  }
  console.log(`   → [${chosenMetrics.join(', ')}]`);

  // 3. Time range
  console.log('\n   ── Time Range ──');
  const customRange = await ask('   Custom ISO range? (y/N): ');
  let timeRange = null;
  if (customRange.toLowerCase() === 'y') {
    const s = await ask('   Start (e.g. 2025-01-01T00:00:00Z): ');
    const e = await ask('   End:   ');
    if (s && e) timeRange = { start: s, end: e };
  }

  // 4. Granularity (LAST)
  console.log('\n   ── Granularity ──');
  meta.granularities.forEach((g, i) => console.log(`   [${i + 1}] ${g.display_label} (${g.name})`));
  const gAns = await ask('\n   Pick granularity (1-5, default 3=day): ');
  const gIdx = Math.min(Math.max((parseInt(gAns) || 3) - 1, 0), meta.granularities.length - 1);
  const granularity = meta.granularities[gIdx];

  // Resolve time range if not custom
  if (!timeRange) timeRange = timeRangeForGranularity(granularity.name);
  console.log(`   Range: ${timeRange.start.slice(0, 16)} → ${timeRange.end.slice(0, 16)}`);

  // Query
  console.log(`\n📡 Querying: ${granularity.name} | ${chosenMetrics.length} metrics | dims: [${chosenDimensions.join(', ') || 'none'}]`);
  console.log('   Request:', JSON.stringify({ metrics: chosenMetrics, dimensions: chosenDimensions, granularity: granularity.name, time_range: timeRange, filters: [{ field:'api_key_id', operator:'eq', value: keyHash }] }));

  const result = await runAnalytics({ keyHash, metrics: chosenMetrics, dimensions: chosenDimensions, granularity: granularity.name, timeRange });
  const rows = result.data ?? [];

  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  📊 ${keyName} · ${granularity.display_label} · [${chosenDimensions.join(', ') || 'no dims'}]`);
  console.log(`${'═'.repeat(62)}`);

  displayTable(rows, meta.metrics, chosenMetrics, chosenDimensions, granularity.name);

  // Totals for non-rate metrics
  const totals = {};
  for (const m of chosenMetrics) {
    const mm = meta.metrics.find(x => x.name === m);
    if (mm && !mm.is_rate) totals[m] = rows.reduce((s, r) => s + Number(r[m] ?? 0), 0);
  }
  const totalEntries = Object.entries(totals).filter(([, v]) => v > 0);
  if (totalEntries.length > 0) {
    console.log('\n   ── Period Totals ──');
    for (const [name, val] of totalEntries) {
      const mm = meta.metrics.find(x => x.name === name);
      console.log(`   ${mm?.display_label ?? name}: ${formatMetricValue(val, mm)}`);
    }
  }

  if (result.metadata?.truncated) console.log('\n   ⚠️  Results truncated — narrow time range.');
}

// ═══════════════════════════════════════════════════════════════════════
//  Budget computation helpers
// ═══════════════════════════════════════════════════════════════════════

function getUsageForInterval(keyDetail, interval) {
  // interval: 'daily' | 'weekly' | 'monthly' | null (lifetime)
  switch (interval) {
    case 'daily':   return keyDetail.usage_daily ?? 0;
    case 'weekly':  return keyDetail.usage_weekly ?? 0;
    case 'monthly': return keyDetail.usage_monthly ?? 0;
    default:        return keyDetail.usage ?? 0; // lifetime
  }
}

function computeLimitState(limitUsd, interval, keyDetail) {
  if (limitUsd == null || limitUsd <= 0) return null;
  const used = getUsageForInterval(keyDetail, interval);
  const remaining = Math.max(0, limitUsd - used);
  const pct = Math.min(100, (used / limitUsd) * 100);
  return { limitUsd, used, remaining, pct, interval: interval ?? 'lifetime' };
}

function printProgressBar(label, state) {
  if (!state) {
    console.log(`  ${label}: (no limit)`);
    return;
  }
  const { limitUsd, used, remaining, pct, interval } = state;
  const barLen = 20;
  const filled = Math.round((pct / 100) * barLen);
  const bar = '█'.repeat(Math.min(filled, barLen)) + '░'.repeat(Math.max(0, barLen - filled));

  console.log(`  ${label}`);
  console.log(`     Limit:      $${limitUsd.toFixed(2)}  (resets: ${interval})`);
  console.log(`     Spent:      $${used.toFixed(6)}`);
  console.log(`     Remaining:  $${remaining.toFixed(4)}  (${(100 - pct).toFixed(1)}% left)`);
  console.log(`     [${bar}]  ${pct.toFixed(1)}%`);
}

// ═══════════════════════════════════════════════════════════════════════
//  MENU: Budget Limits
// ═══════════════════════════════════════════════════════════════════════

async function budgetMenu(keyHash, keyDetail) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  💰 BUDGET LIMITS for ${keyDetail.name}`);
  console.log(`${'═'.repeat(62)}`);

  const keyWorkspaceId = keyDetail.workspace_id;

  // ── Key-level limit ──
  console.log('\n  ── Key-Level Limit ──');
  const keyState = computeLimitState(keyDetail.limit, keyDetail.limit_reset, keyDetail);
  if (keyState) {
    printProgressBar('Key limit ' + (keyDetail.include_byok_in_limit ? '(incl. BYOK)' : '(excl. BYOK)'), keyState);
  } else {
    console.log('  (no key-level limit set)');
  }

  // ── Guardrails (all types: explicit key assignments + workspace-level) ──
  console.log('\n  ── Guardrail & Workspace Limits ──');
  let guardrails;
  try { guardrails = await listGuardrails(); } catch (e) {
    console.log(`  ⚠️  Could not list guardrails: ${e.message.split('\n')[0]}`);
    guardrails = [];
  }

  const explicitGuards = [];
  const workspaceGuards = [];

  for (const g of guardrails) {
    let assignments;
    try { assignments = await listGuardrailKeyAssignments(g.id); } catch { assignments = []; }

    // Two ways a guardrail applies to this key:
    // 1. Explicitly assigned to this key
    // 2. Workspace-level: name starts with "Workspace " AND belongs to key's workspace AND has a limit set
    const explicitMatch = assignments.some(a => a.key_hash === keyHash);
    const isWorkspaceGuardrail = /^Workspace [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(g.name);
    const workspaceMatch = !explicitMatch && isWorkspaceGuardrail && g.limit_usd != null && g.workspace_id === keyWorkspaceId;

    if (explicitMatch) {
      explicitGuards.push({ guardrail: g, assignments });
    } else if (workspaceMatch) {
      workspaceGuards.push({ guardrail: g, assignments });
    }
  }

  // Show explicitly assigned guardrails
  if (explicitGuards.length > 0) {
    for (const { guardrail: g } of explicitGuards) {
      const state = computeLimitState(g.limit_usd, g.reset_interval, keyDetail);
      console.log(`\n  🛡️  ${g.name}${g.limit_usd != null ? '' : ' (no spending limit)'}`);
      console.log(`     ID: ${g.id.slice(0, 8)}...  |  Workspace: ${g.workspace_id?.slice(0, 8) ?? '?'}...  |  Type: key-assigned`);
      if (state) {
        printProgressBar('Limit', state);
      }
    }
  }

  // Show workspace-level guardrails (budgets that apply to all keys)
  if (workspaceGuards.length > 0) {
    for (const { guardrail: g } of workspaceGuards) {
      const state = computeLimitState(g.limit_usd, g.reset_interval, keyDetail);
      console.log(`\n  🛡️  ${g.name}${g.limit_usd != null ? '' : ' (no spending limit)'}`);
      console.log(`     ID: ${g.id.slice(0, 8)}...  |  Workspace: ${g.workspace_id?.slice(0, 8) ?? '?'}...  |  Type: workspace-wide`);
      if (state) {
        printProgressBar('Limit', state);
      }
    }
  }

  if (explicitGuards.length === 0 && workspaceGuards.length === 0) {
    console.log('  (no guardrails or workspace budgets found)');
  }

  // ── Workspace budgets via /workspaces/{id}/budgets (broken endpoint fallback note) ──
  console.log('\n  ── Note ──');
  console.log('  Workspace budgets are surfaced as guardrails above (workspace-wide type).');
  console.log('  The /workspaces/{id}/budgets endpoint currently returns 404 —');
  console.log('  once fixed server-side, we will also check it for additional budgets.');
}

// ═══════════════════════════════════════════════════════════════════════
//  MENU: Guardrails (no granularity!)
// ═══════════════════════════════════════════════════════════════════════

async function guardrailsMenu(keyHash, keyName) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  🛡️  GUARDRAILS`);
  console.log(`${'═'.repeat(62)}`);

  let guardrails;
  try { guardrails = await listGuardrails(); } catch (e) {
    console.log(`\n  ❌ Could not list guardrails: ${e.message.split('\n')[0]}`);
    return;
  }

  if (!guardrails.length) {
    console.log('\n  (no guardrails configured)');
    return;
  }

  console.log(`\n  ${guardrails.length} guardrail(s) found.\n`);

  for (const g of guardrails) {
    // Fetch key assignments for this guardrail
    let assignments;
    try { assignments = await listGuardrailKeyAssignments(g.id); } catch { assignments = []; }

    const assignedToThis = assignments.some(a => a.key_hash === keyHash);
    const marker = assignedToThis ? ' ← THIS KEY' : '';

    console.log(`  🛡️  ${g.name}${marker}`);
    console.log(`     ID:              ${g.id}`);
    if (g.description) console.log(`     Description:     ${g.description}`);
    console.log(`     Workspace:       ${g.workspace_id}`);
    if (g.limit_usd != null) {
      console.log(`     Limit:           $${g.limit_usd.toFixed(2)} (reset: ${g.reset_interval ?? 'never'})`);
    } else {
      console.log('     Limit:           (no spending limit)');
    }
    if (g.allowed_models?.length) console.log(`     Allowed models:  ${g.allowed_models.join(', ')}`);
    if (g.allowed_providers?.length) console.log(`     Allowed provs:   ${g.allowed_providers.join(', ')}`);
    if (g.ignored_models?.length) console.log(`     Ignored models:  ${g.ignored_models.join(', ')}`);
    if (g.ignored_providers?.length) console.log(`     Ignored provs:   ${g.ignored_providers.join(', ')}`);

    // ZDR
    const zdrs = [];
    if (g.enforce_zdr_anthropic) zdrs.push('Anthropic');
    if (g.enforce_zdr_openai) zdrs.push('OpenAI');
    if (g.enforce_zdr_google) zdrs.push('Google');
    if (g.enforce_zdr_xai) zdrs.push('xAI');
    if (g.enforce_zdr_other) zdrs.push('Other');
    if (zdrs.length) console.log(`     ZDR enforced:    ${zdrs.join(', ')}`);

    // Content filters
    const cfs = [];
    if (g.content_filters?.length) cfs.push(`${g.content_filters.length} custom`);
    if (g.content_filter_builtins?.length) cfs.push(`${g.content_filter_builtins.length} built-in`);
    if (cfs.length) console.log(`     Filters:         ${cfs.join(', ')}`);

    // Key assignments
    console.log(`     Key assignments: ${assignments.length}`);
    for (const a of assignments) {
      const isThis = a.key_hash === keyHash ? ' ★' : '';
      console.log(`       - ${a.key_name} (${a.key_label?.slice(0, 20) ?? '?'})${isThis}`);
    }

    console.log(`     Created:         ${g.created_at?.slice(0, 10)}`);
    console.log('');
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  OPENROUTER ANALYTICS EXPLORER');
  console.log(`  ${new Date().toISOString().slice(0, 19)}`);
  console.log('══════════════════════════════════════════════');

  if (!MGMT_KEY) {
    console.error('\n❌ OPENROUTER_MANAGEMENT_KEY not set in .env');
    process.exit(1);
  }

  // Init
  const meta = await fetchMeta();
  const keys = await listKeys();

  console.log(`\n   ${keys.length} API keys found:`);
  keys.forEach((k, i) => console.log(`   [${i + 1}] ${k.name.padEnd(20)} · ${k.label?.slice(0, 30) ?? '(no label)'}  ${k.disabled ? '🔒 DISABLED' : ''}`));

  const keyAns = await ask(`\n   Pick a key (1-${keys.length}, default 1): `);
  const chosenKey = keys[Math.min(Math.max((parseInt(keyAns) || 1) - 1, 0), keys.length - 1)];

  let keyDetail = await showKeyOverview(chosenKey);

  // Main loop
  while (true) {
    console.log('\n   ── Menu ──');
    console.log('   [1] Analytics (dimensions → metrics → time range → granularity)');
    console.log('   [2] Budget Limits (key limit + guardrails + workspace budgets)');
    console.log('   [3] Guardrails (no granularity, all guardrails & key assignments)');
    console.log('   [4] Switch key');
    console.log('   [q] Quit');

    const choice = await ask('\n   Choice: ');

    if (choice === 'q' || choice === 'Q') break;

    if (choice === '4') {
      console.log('\n   Keys:');
      keys.forEach((k, i) => console.log(`   [${i + 1}] ${k.name}`));
      const kAns = await ask('   Pick key: ');
      const kIdx = Math.min(Math.max((parseInt(kAns) || 1) - 1, 0), keys.length - 1);
      Object.assign(chosenKey, keys[kIdx]);
      keyDetail = await showKeyOverview(chosenKey);
      continue;
    }

    if (choice === '2') { await budgetMenu(chosenKey.hash, keyDetail); continue; }
    if (choice === '3') { await guardrailsMenu(chosenKey.hash, chosenKey.name); continue; }

    // default: analytics
    await analyticsMenu(chosenKey.hash, meta, chosenKey.name);
  }

  console.log('\n══════════════════════════════════════════════');
  console.log('  ✅ Done');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1); });