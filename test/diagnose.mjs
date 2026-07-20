import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });
const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE = 'https://openrouter.ai/api/v1';

let PASS = 0;
let FAIL = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.ok) {
      PASS++;
      console.log(`  ✅ ${name}`);
    } else {
      FAIL++;
      console.log(`  ❌ ${name}`);
      console.log(`     Status: ${result.status} ${result.statusText}`);
      console.log(`     Body: ${typeof result.body === 'object' ? JSON.stringify(result.body, null, 4) : result.body}`);
    }
    return result;
  } catch (e) {
    FAIL++;
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${e.message}`);
    return { ok: false, status: 0, body: null };
  }
}

async function fetchJSON(endpoint, init = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${MGMT_KEY}`, 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, statusText: res.statusText, body };
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════

async function main() {
  console.log('══════════════════════════════════════════════════════');
  console.log('  COMPLETE API DIAGNOSTIC — OpenRouter Tracker');
  console.log(`  Key: ${MGMT_KEY?.slice(0, 24)}...`);
  console.log('══════════════════════════════════════════════════════\n');

  // ── 1. GET /keys ──────────────────────────────────────────────
  console.log('─── [1] GET /keys (listKeys) ───');
  const keysRes = await test('GET /keys', () => fetchJSON('/keys'));
  if (!keysRes.ok) { printSummary(); return; }

  const keys = keysRes.body.data ?? [];
  console.log(`       → ${keys.length} keys found\n`);

  // ── 2. GET /keys/{hash} for EACH key ──────────────────────────
  console.log('─── [2] GET /keys/{hash} (getKeyDetail) ───');
  const keyDetails = [];
  for (const k of keys) {
    const r = await test(`GET /keys/${k.hash.slice(0, 16)}... (${k.name})`, () => fetchJSON(`/keys/${k.hash}`));
    if (r.ok) keyDetails.push(r.body.data);
  }
  console.log('');

  // ── 3. Test with a NONEXISTENT hash (reproduce the 404 error) ─
  console.log('─── [3] GET /keys/{fakeHash} (404 reproduction) ───');
  await test('GET /keys/0000000000000000000000000000000000000000000000000000000000000000', 
    () => fetchJSON('/keys/0000000000000000000000000000000000000000000000000000000000000000'));
  console.log('');

  // ── 4. GET /analytics/meta ────────────────────────────────────
  console.log('─── [4] GET /analytics/meta (fetchMeta) ───');
  const metaRes = await test('GET /analytics/meta', () => fetchJSON('/analytics/meta'));
  let meta;
  if (metaRes.ok) meta = metaRes.body.data;
  console.log('');

  // ── 5. POST /analytics/query (runAnalytics) ───────────────────
  console.log('─── [5] POST /analytics/query (runAnalytics) ───');
  if (keys.length > 0 && meta) {
    const now = new Date();
    const start = new Date(now - 7 * 86400000).toISOString();
    const end = now.toISOString();
    const hash = keys[0].hash;

    // 5a — with filter (like extension does)
    await test('POST /analytics/query (with api_key_id filter)', () =>
      fetchJSON('/analytics/query', {
        method: 'POST',
        body: JSON.stringify({
          metrics: ['total_usage'],
          granularity: 'day',
          time_range: { start, end },
          filters: [{ field: 'api_key_id', operator: 'eq', value: hash }],
          limit: 1000,
        }),
      }));

    // 5b — with dimensions
    await test('POST /analytics/query (with dimensions)', () =>
      fetchJSON('/analytics/query', {
        method: 'POST',
        body: JSON.stringify({
          metrics: ['total_usage'],
          dimensions: ['model'],
          granularity: 'day',
          time_range: { start, end },
          filters: [{ field: 'api_key_id', operator: 'eq', value: hash }],
          limit: 1000,
        }),
      }));

    // 5c — multiple metrics (like extension dashboard)
    await test('POST /analytics/query (multiple metrics)', () =>
      fetchJSON('/analytics/query', {
        method: 'POST',
        body: JSON.stringify({
          metrics: ['request_count', 'total_usage', 'credits_usage', 'openrouter_usage'],
          granularity: 'day',
          time_range: { start, end },
          filters: [{ field: 'api_key_id', operator: 'eq', value: hash }],
          limit: 1000,
        }),
      }));
  } else {
    console.log('   ⏭️  Skipped (no keys or meta)\n');
  }
  console.log('');

  // ── 6. GET /guardrails ────────────────────────────────────────
  console.log('─── [6] GET /guardrails (listGuardrails) ───');
  const guardsRes = await test('GET /guardrails', () => fetchJSON('/guardrails'));
  let guards = [];
  if (guardsRes.ok) guards = guardsRes.body.data ?? [];
  console.log(`       → ${guards.length} guardrails found\n`);

  // ── 7. GET /guardrails/{id}/assignments/keys ──────────────────
  console.log('─── [7] GET /guardrails/{id}/assignments/keys (listGuardrailKeyAssignments) ───');
  if (guards.length > 0) {
    for (const g of guards) {
      await test(`GET /guardrails/${g.id.slice(0, 8)}.../assignments/keys`, 
        () => fetchJSON(`/guardrails/${g.id}/assignments/keys`));
    }
  } else {
    console.log('   ⏭️  Skipped (no guardrails)');
  }
  console.log('');

  // ── 8. GET /workspaces ────────────────────────────────────────
  console.log('─── [8] GET /workspaces (extra check) ───');
  await test('GET /workspaces', () => fetchJSON('/workspaces'));
  console.log('');

  // ═══════════════════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════════════════
  printSummary();
}

function printSummary() {
  const total = PASS + FAIL;
  console.log('══════════════════════════════════════════════════════');
  console.log(`  RESULTS:  ✅ ${PASS} passed  |  ❌ ${FAIL} failed  |  ${total} total`);
  console.log('══════════════════════════════════════════════════════');

  if (FAIL > 0) {
    console.log('\n  💡 TIPS:');
    console.log('  • If GET /keys/{hash} fails with 404 "API key not found":');
    console.log('    → The extension stores the key hash in globalState.');
    console.log('    → If you changed the management key, the old stored hash');
    console.log('      may not exist under the new key. Open the dashboard to');
    console.log('      re-select a key, or run "OpenRouter Tracker: Refresh Status".');
    console.log('  • If ALL endpoints fail with 401/403:');
    console.log('    → The management key in settings.json is wrong.');
    console.log('    → Check openrouterTracker.managementKey in VS Code settings.');
    console.log('  • If only analytics endpoints fail:');
    console.log('    → The management key may lack analytics permissions.');
  }
}

main().catch(e => { console.error('\nFATAL:', e.message); process.exit(1); });
