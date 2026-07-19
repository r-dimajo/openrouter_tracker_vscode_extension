import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });
const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE = 'https://openrouter.ai/api/v1';

async function fetchJSON(endpoint, init = {}) {
  const res = await fetch(`${BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${MGMT_KEY}`, 'Content-Type': 'application/json', ...init.headers },
    ...init,
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { ok: res.ok, status: res.status, body };
}

// 1. List keys
console.log('=== /keys ===');
const keysRes = await fetchJSON('/keys');
console.log(JSON.stringify(keysRes.body, null, 2));

// 2. Meta
console.log('\n=== /analytics/meta ===');
const metaRes = await fetchJSON('/analytics/meta');
if (metaRes.ok) {
  const { metrics, dimensions, granularities } = metaRes.body.data;
  console.log('GRANULARITIES:', JSON.stringify(granularities, null, 2));
  console.log('DIMENSIONS:', JSON.stringify(dimensions, null, 2));
  console.log('METRICS:', JSON.stringify(metrics, null, 2));
} else {
  console.log(JSON.stringify(metaRes.body, null, 2));
}

// 3. Get key hash
const firstKey = keysRes.body.data?.[0];
const keyHash = firstKey?.hash;
console.log('\nKey hash:', keyHash);

// 4. Try a simple query with ALL metrics, no dimensions, day granularity
const now = new Date();
const start = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
const end = now.toISOString();

if (keyHash && metaRes.ok) {
  const allMetrics = metaRes.body.data.metrics.map(m => m.name);
  console.log('\n=== Trying ALL metrics, day, no dimensions ===');
  console.log('Metrics:', allMetrics.join(', '));

  const qRes = await fetchJSON('/analytics/query', {
    method: 'POST',
    body: JSON.stringify({
      metrics: allMetrics,
      granularity: 'day',
      time_range: { start, end },
      filters: [{ field: 'api_key_id', operator: 'eq', value: keyHash }],
      limit: 5,
      order_by: { field: 'date', direction: 'desc' },
    }),
  });
  console.log('Status:', qRes.status, qRes.ok ? 'OK' : 'FAIL');
  if (qRes.ok) {
    console.log('Row count:', qRes.body.data?.data?.length);
    if (qRes.body.data?.data?.length > 0) {
      const row = qRes.body.data.data[0];
      console.log('Sample row keys:', Object.keys(row).join(', '));
      console.log('Sample row:');
      console.log(JSON.stringify(row, null, 2));
    }
  } else {
    console.log(JSON.stringify(qRes.body, null, 2));
  }

  // 5. Try with model dimension
  console.log('\n=== Trying ALL metrics, day, model dimension ===');
  const qRes2 = await fetchJSON('/analytics/query', {
    method: 'POST',
    body: JSON.stringify({
      metrics: allMetrics,
      granularity: 'day',
      dimensions: ['model'],
      time_range: { start, end },
      filters: [{ field: 'api_key_id', operator: 'eq', value: keyHash }],
      limit: 5,
      order_by: { field: 'total_usage', direction: 'desc' },
    }),
  });
  console.log('Status:', qRes2.status, qRes2.ok ? 'OK' : 'FAIL');
  if (qRes2.ok) {
    console.log('Row count:', qRes2.body.data?.data?.length);
    if (qRes2.body.data?.data?.length > 0) {
      const row = qRes2.body.data.data[0];
      console.log('Sample row keys:', Object.keys(row).join(', '));
      console.log('Sample row:');
      console.log(JSON.stringify(row, null, 2));
    }
  } else {
    console.log(JSON.stringify(qRes2.body, null, 2));
  }
}
