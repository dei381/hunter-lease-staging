import https from 'https';

const BASE = 'https://hunter-lease-staging.onrender.com';

let passed = 0;
let failed = 0;

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(BASE + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

function post(path, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname: 'hunter-lease-staging.onrender.com',
      path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function check(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  console.log(`\n🔍 Testing ${BASE}\n`);

  // 1. Health check
  console.log('--- 1. Health / Homepage ---');
  try {
    const r = await get('/');
    check('Homepage responds', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('Homepage responds', false, e.message); }

  // 2. GET /api/deals
  console.log('\n--- 2. GET /api/deals ---');
  try {
    const r = await get('/api/deals');
    check('Status 200', r.status === 200, `HTTP ${r.status}`);
    check('Returns array', Array.isArray(r.body), typeof r.body);
    if (Array.isArray(r.body)) {
      check('Has deals', r.body.length > 0, `${r.body.length} deals`);
      if (r.body.length > 0) {
        const d = r.body[0];
        check('Deal has id', !!d.id, `id=${d.id}`);
        check('Deal has make', !!d.make, `make=${d.make}`);
        check('Deal has model', !!d.model, `model=${d.model}`);
        check('Deal has payment', typeof d.payment === 'number', `payment=${d.payment}`);
        check('ownerVerdict has pros array', Array.isArray(d.ownerVerdict?.pros), JSON.stringify(d.ownerVerdict)?.slice(0, 60));
        check('ownerVerdict has cons array', Array.isArray(d.ownerVerdict?.cons), '');
        check('ownerVerdict has summary', typeof d.ownerVerdict?.summary === 'string', '');
        check('categorizedFeatures has arrays', 
          d.categorizedFeatures && Object.values(d.categorizedFeatures).every(v => Array.isArray(v)),
          Object.keys(d.categorizedFeatures || {}).join(', ')
        );
      }
    }
  } catch (e) { check('/api/deals', false, e.message); }

  // 3. GET /api/deals?id=<first_id>
  console.log('\n--- 3. GET /api/deals?id=<specific> ---');
  try {
    const all = await get('/api/deals');
    if (Array.isArray(all.body) && all.body.length > 0) {
      const id = all.body[0].id;
      const r = await get(`/api/deals?id=${id}`);
      check('Status 200', r.status === 200, `HTTP ${r.status}`);
      check('Returns array with 1 item', Array.isArray(r.body) && r.body.length === 1, `length=${r.body?.length}`);
    } else {
      check('Skip (no deals)', true, 'no deals to test with');
    }
  } catch (e) { check('/api/deals?id=', false, e.message); }

  // 4. POST /api/lead
  console.log('\n--- 4. POST /api/lead ---');
  try {
    const r = await post('/api/lead', {
      client: { name: 'Test User', phone: '5551234567', email: 'test@test.com' },
      car: { make: 'BMW', model: 'X5', year: 2024 },
      calc: { type: 'lease', payment: 499, down: 3000 },
      source: 'test_script'
    });
    check('Status 200 or 201', r.status === 200 || r.status === 201, `HTTP ${r.status}`);
    check('Returns leadId', !!r.body?.leadId, `leadId=${r.body?.leadId}`);
  } catch (e) { check('/api/lead', false, e.message); }

  // 5. GET /api/car-photos
  console.log('\n--- 5. GET /api/car-photos ---');
  try {
    const r = await get('/api/car-photos');
    check('Status 200', r.status === 200, `HTTP ${r.status}`);
    check('Returns array', Array.isArray(r.body), typeof r.body);
  } catch (e) { check('/api/car-photos', false, e.message); }

  // 6. GET /api/site-settings
  console.log('\n--- 6. GET /api/site-settings ---');
  try {
    const r = await get('/api/site-settings');
    check('Status 200', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('/api/site-settings', false, e.message); }

  // Summary
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
