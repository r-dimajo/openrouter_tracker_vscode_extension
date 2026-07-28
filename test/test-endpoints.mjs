import 'dotenv/config';

const MGMT_KEY = process.env.OPENROUTER_MANAGEMENT_KEY;
const BASE = 'https://openrouter.ai/api/v1';

async function fetchJSON(endpoint) {
  const res = await fetch(BASE + endpoint, {
    headers: { Authorization: `Bearer ${MGMT_KEY}` }
  });
  return res.json();
}

// Fetch a Gemini model's endpoints to see ZDR info
const models = await fetchJSON('/models?limit=5');
console.log('Sample models (without ZDR filter):');
for (const model of models.data) {
  console.log(`\n${model.name} (${model.id}):`);
  console.log('  top_provider:', JSON.stringify(model.top_provider, null, 2));
  console.log('  Full model keys:', Object.keys(model).join(', '));
}
