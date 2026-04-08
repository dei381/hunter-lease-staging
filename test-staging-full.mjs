import https from 'https';

const BASE = 'https://hunter-lease-staging.onrender.com';
let passed = 0, failed = 0, warnings = 0;

function get(path) {
  return new Promise((resolve, reject) => {
    https.get(BASE + path, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
      });
    }).on('error', reject);
  });
}

function post(path, payload, authToken = null) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const options = { hostname: 'hunter-lease-staging.onrender.com', path, method: 'POST', headers };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data), raw: data }); }
        catch { resolve({ status: res.statusCode, body: null, raw: data }); }
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

function warn(name, detail = '') {
  console.log(`  ⚠️  ${name}${detail ? ' — ' + detail : ''}`);
  warnings++;
}

async function run() {
  console.log(`\n🔍 Full staging test: ${BASE}\n`);

  // ── 1. Homepage ──────────────────────────────────────────
  console.log('── 1. Homepage ──');
  try {
    const r = await get('/');
    check('Loads (200)', r.status === 200, `HTTP ${r.status}`);
    check('Returns HTML', r.raw.includes('<html') || r.raw.includes('<!DOCTYPE'), r.raw.slice(0, 60));
  } catch (e) { check('Homepage', false, e.message); }

  // ── 2. Deals catalog ────────────────────────────────────
  console.log('\n── 2. Deals catalog ──');
  let deals = [];
  try {
    const r = await get('/api/deals');
    check('GET /api/deals → 200', r.status === 200, `HTTP ${r.status}`);
    check('Returns array', Array.isArray(r.body), typeof r.body);
    if (Array.isArray(r.body)) {
      deals = r.body;
      check('Has deals', deals.length > 0, `${deals.length} deals found`);
      deals.forEach((d, i) => {
        const label = `deal[${i}] ${d.make} ${d.model}`;
        check(`${label} — payment is number`, typeof d.payment === 'number', `$${d.payment}/mo`);
        check(`${label} — ownerVerdict.pros is array`, Array.isArray(d.ownerVerdict?.pros), '');
        check(`${label} — ownerVerdict.cons is array`, Array.isArray(d.ownerVerdict?.cons), '');
        check(`${label} — categorizedFeatures valid`, d.categorizedFeatures && Object.values(d.categorizedFeatures).every(v => Array.isArray(v)), '');
        check(`${label} — has images field`, 'images' in d, '');
        if (!d.image && (!d.images || d.images.length === 0)) warn(`${label} — no images`);
      });
    }
  } catch (e) { check('/api/deals', false, e.message); }

  // ── 3. Individual deal page ──────────────────────────────
  console.log('\n── 3. Individual deal by ID ──');
  if (deals.length > 0) {
    for (const deal of deals) {
      try {
        const r = await get(`/api/deals?id=${deal.id}`);
        check(`GET /api/deals?id=${deal.id.slice(0,8)}... → 200`, r.status === 200, `HTTP ${r.status}`);
        check(`Returns single deal`, Array.isArray(r.body) && r.body.length === 1, `length=${r.body?.length}`);
        if (Array.isArray(r.body) && r.body[0]) {
          const d = r.body[0];
          check(`Deal has detailedSpecs`, !!d.detailedSpecs && Object.keys(d.detailedSpecs).length > 0, Object.keys(d.detailedSpecs || {}).join(', '));
          check(`Deal has categorizedFeatures`, !!d.categorizedFeatures, '');
          check(`Deal ownerVerdict.summary is string`, typeof d.ownerVerdict?.summary === 'string', d.ownerVerdict?.summary?.slice(0, 50));
        }
      } catch (e) { check(`deal ${deal.id}`, false, e.message); }
    }
  } else {
    warn('No deals — skipping individual deal tests');
  }

  // ── 4. Lead submission ──────────────────────────────────
  console.log('\n── 4. Lead submission ──');
  try {
    const dealId = deals[0]?.id || null;
    const r = await post('/api/lead', {
      client: { name: 'Staging Tester', phone: '5551112233', email: 'staging@test.com', tcpaConsent: true, termsConsent: true },
      car: { make: deals[0]?.make || 'BMW', model: deals[0]?.model || 'X5', year: deals[0]?.year || 2024, trim: deals[0]?.trim || 'Base', msrp: deals[0]?.msrp || 50000 },
      calc: { type: 'lease', payment: deals[0]?.payment || 499, down: 3000, tier: 'Tier 1' },
      dealId,
      source: 'test_script'
    });
    check('POST /api/lead → 200', r.status === 200 || r.status === 201, `HTTP ${r.status} — ${JSON.stringify(r.body).slice(0,80)}`);
    check('Returns leadId', !!r.body?.leadId, `leadId=${r.body?.leadId}`);
  } catch (e) { check('/api/lead', false, e.message); }

  // ── 5. Lead submission — empty fields (edge case) ───────
  console.log('\n── 5. Lead submission — minimal/empty fields ──');
  try {
    const r = await post('/api/lead', {
      client: { name: '', phone: '', email: '' },
      source: 'test_minimal'
    });
    check('Minimal lead → no 500', r.status !== 500, `HTTP ${r.status}`);
    if (r.status === 400) warn('Minimal lead → 400 (validation)', JSON.stringify(r.body).slice(0, 100));
  } catch (e) { check('Minimal lead', false, e.message); }

  // ── 6. Car photos ────────────────────────────────────────
  console.log('\n── 6. Car photos ──');
  try {
    const r = await get('/api/car-photos');
    check('GET /api/car-photos → 200', r.status === 200, `HTTP ${r.status}`);
    check('Returns array', Array.isArray(r.body), typeof r.body);
    if (Array.isArray(r.body)) {
      check('Has photos', r.body.length > 0, `${r.body.length} photos`);
    }
  } catch (e) { check('/api/car-photos', false, e.message); }

  // ── 7. Site settings ────────────────────────────────────
  console.log('\n── 7. Site settings ──');
  try {
    const r = await get('/api/site-settings');
    check('GET /api/site-settings → 200', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('/api/site-settings', false, e.message); }

  // ── 8. Deals with query params ───────────────────────────
  console.log('\n── 8. Deals with calculator params ──');
  try {
    const r = await get('/api/deals?term=36&down=3000&mileage=10k&tier=t1');
    check('Deals with params → 200', r.status === 200, `HTTP ${r.status}`);
    check('Returns array', Array.isArray(r.body), '');
    if (Array.isArray(r.body) && r.body.length > 0) {
      check('Payment recalculated', typeof r.body[0].payment === 'number', `$${r.body[0].payment}/mo`);
    }
  } catch (e) { check('/api/deals?params', false, e.message); }

  // ── 9. 404 handling ─────────────────────────────────────
  console.log('\n── 9. Error handling ──');
  try {
    const r = await get('/api/deals?id=nonexistent-id-12345');
    check('Nonexistent deal → empty array (not crash)', Array.isArray(r.body) && r.body.length === 0, `got ${JSON.stringify(r.body).slice(0,40)}`);
  } catch (e) { check('Nonexistent deal', false, e.message); }

  try {
    const r = await get('/api/nonexistent-endpoint');
    check('Unknown endpoint → 404 (not 500)', r.status === 404, `HTTP ${r.status}`);
  } catch (e) { check('Unknown endpoint', false, e.message); }

  // ── Summary ──────────────────────────────────────────────
  console.log(`\n${'═'.repeat(45)}`);
  console.log(`✅ Passed:   ${passed}`);
  console.log(`❌ Failed:   ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log('═'.repeat(45));
  if (failed === 0) console.log('\n🎉 All checks passed — staging is good to go!\n');
  else console.log('\n🚨 Some checks failed — see above.\n');

  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
