import 'dotenv/config';

const API_KEY = process.env.OPENROUTER_API_KEY;
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

  console.log('\n══════════════════════════════════════════════');
  console.log('  ✅ Done');
  console.log('══════════════════════════════════════════════\n');
}

main().catch(console.error);