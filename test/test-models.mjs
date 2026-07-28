import 'dotenv/config';

const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE     = 'https://openrouter.ai/api/v1';

// ── Helpers ────────────────────────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════
//  MODELS API TEST
// ═══════════════════════════════════════════════════════════════════════

async function listModels(params = {}) {
  const query = new URLSearchParams();
  
  // Pagination
  if (params.limit) query.set('limit', params.limit);
  if (params.offset) query.set('offset', params.offset);
  
  // Sorting
  if (params.sort) query.set('sort', params.sort);
  
  // Filters
  if (params.zdr) query.set('zdr', 'true');
  if (params.q) query.set('q', params.q);
  if (params.min_price != null) query.set('min_output_price', params.min_price);
  if (params.max_price != null) query.set('max_output_price', params.max_price);
  
  const queryString = query.toString();
  const endpoint = queryString ? `/models?${queryString}` : '/models';
  
  console.log(`Fetching: ${endpoint}`);
  const data = await fetchJSON(endpoint);
  return data;
}

function formatPrice(priceStr) {
  if (!priceStr) return '—';
  const price = parseFloat(priceStr);
  if (isNaN(price)) return '—';
  // Price is per token, convert to per million tokens
  const perMillion = price * 1000000;
  return `$${perMillion.toFixed(4)}`;
}

function formatContext(contextLength) {
  if (!contextLength || contextLength === null) return '—';
  const length = Number(contextLength);
  if (isNaN(length)) return '—';
  
  if (length >= 1000000) {
    return (length / 1000000).toFixed(1) + 'M';
  } else if (length >= 1000) {
    return (length / 1000).toFixed(0) + 'K';
  } else {
    return length.toString();
  }
}

function displayModels(response) {
  console.log(`\nTotal models: ${response.total_count}`);
  console.log(`Showing: ${response.data.length} models\n`);
  
  console.log('Name'.padEnd(40) + 'Slug'.padEnd(35) + 'Input ($/M)'.padEnd(12) + 'Output ($/M)'.padEnd(12) + 'Context'.padEnd(10) + 'ZDR');
  console.log('─'.repeat(120));
  
  for (const model of response.data) {
    const name = (model.name || '—').substring(0, 38).padEnd(40);
    const slug = (model.id || '—').substring(0, 33).padEnd(35);
    const inputPrice = formatPrice(model.pricing?.prompt).padEnd(12);
    const outputPrice = formatPrice(model.pricing?.completion).padEnd(12);
    const context = formatContext(model.context_length || model.top_provider?.context_length).padEnd(10);
    const zdr = model.top_provider?.is_moderated ? 'Yes' : 'No';
    
    console.log(`${name}${slug}${inputPrice}${outputPrice}${context}${zdr}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════
//  TEST RUNS
// ═══════════════════════════════════════════════════════════════════════

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(' OpenRouter Models API Test');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  if (!MGMT_KEY) {
    console.error('ERROR: OPENROUTER_MANAGEMENT_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Test 1: Basic list (first 20 models)
    console.log('Test 1: Fetch first 20 models (default sort)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test1 = await listModels({ limit: 20 });
    displayModels(test1);

    // Test 2: Sort by pricing low to high
    console.log('\n\nTest 2: Sort by pricing (low to high)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test2 = await listModels({ limit: 20, sort: 'pricing-low-to-high' });
    displayModels(test2);

    // Test 3: Filter by ZDR
    console.log('\n\nTest 3: Filter by ZDR (zero data retention)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test3 = await listModels({ limit: 20, zdr: true });
    displayModels(test3);

    // Test 4: Filter by price range
    console.log('\n\nTest 4: Filter by price range ($0-$10 per million tokens)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test4 = await listModels({ 
      limit: 20, 
      sort: 'pricing-low-to-high',
      min_price: 0,
      max_price: 10
    });
    displayModels(test4);

    // Test 5: Search by string
    console.log('\n\nTest 5: Search for "gpt-4"');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test5 = await listModels({ limit: 20, q: 'gpt-4' });
    displayModels(test5);

    // Test 6: Combined filters
    console.log('\n\nTest 6: Combined filters (ZDR + price range + search)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test6 = await listModels({ 
      limit: 20, 
      zdr: true,
      min_price: 0,
      max_price: 5,
      q: 'claude'
    });
    displayModels(test6);

    // Test 7: Pagination
    console.log('\n\nTest 7: Pagination (offset=20, limit=20)');
    console.log('─────────────────────────────────────────────────────────────────────');
    const test7 = await listModels({ limit: 20, offset: 20 });
    displayModels(test7);

    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log(' All tests completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
