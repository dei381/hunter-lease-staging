/**
 * Fetch representative photos per model from MarketCheck (new, California) and write
 * scripts/_mc_photos.json keyed by the grid's model name. Frugal with the 500/mo quota:
 * one search call per base model.
 *
 * Usage:
 *   npx tsx scripts/fetch_marketcheck_photos.ts <grid.csv> [--make Hyundai] [--key KEY]
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const csvPath = argv.find(a => !a.startsWith('--')) || 'C:/Users/noobi/Downloads/Hyundai_lease_grid_2026-06.csv';
const argMake = (() => { const i = argv.indexOf('--make'); return i >= 0 ? argv[i + 1] : undefined; })();
const argKey = (() => { const i = argv.indexOf('--key'); return i >= 0 ? argv[i + 1] : undefined; })();
const KEY = argKey || process.env.MARKETCHECK_API_KEY || 'gxoEDCZUX1tkbsmLHxROWAb8WurvVw2A';

function distinctModels(text: string, make: string): string[] {
  const lines = text.split('\n').filter(Boolean);
  const header = lines[0].split(',');
  const mi = header.indexOf('make');
  const moi = header.indexOf('model');
  const set = new Set<string>();
  for (const line of lines.slice(1)) {
    const cols = line.split(',');
    if ((cols[mi] || '').trim().toLowerCase() === make.toLowerCase()) {
      const m = (cols[moi] || '').trim();
      if (m) set.add(m);
    }
  }
  return Array.from(set);
}

// derive a MarketCheck search model from a grid model (strip powertrain suffixes)
function baseModel(m: string): string {
  return m
    .replace(/\s+Plug-In Hybrid$/i, '')
    .replace(/\s+Hybrid$/i, '')
    .replace(/\s+Electric$/i, '')
    .replace(/\s+N$/i, '')
    .trim();
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function fetchPhotosForModel(make: string, model: string): Promise<string[]> {
  const url = `https://api.marketcheck.com/v2/search/car/active?api_key=${KEY}` +
    `&state=CA&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}` +
    `&car_type=new&rows=10&photo_links=true`;
  try {
    const r = await fetch(url);
    if (!r.ok) { console.warn(`  ${model}: HTTP ${r.status}`); return []; }
    const j: any = await r.json();
    const listings: any[] = j.listings || [];
    for (const l of listings) {
      const photos: string[] = l.media?.photo_links || l.media?.photo_links_cached || l.photo_links || [];
      if (photos && photos.length > 0) {
        return photos.slice(0, 8).map(p => String(p).replace(/^http:/, 'https:'));
      }
    }
    return [];
  } catch (e: any) {
    console.warn(`  ${model}: ${e.message}`);
    return [];
  }
}

async function main() {
  const text = fs.readFileSync(csvPath, 'utf8');
  const make = argMake || text.split('\n')[1]?.split(',')[0]?.trim() || 'Hyundai';
  const models = distinctModels(text, make);
  console.log(`Make: ${make}, models: ${models.length}`);

  // group grid models by base model to minimize API calls
  const baseToModels = new Map<string, string[]>();
  for (const m of models) {
    const b = baseModel(m);
    if (!baseToModels.has(b)) baseToModels.set(b, []);
    baseToModels.get(b)!.push(m);
  }
  console.log(`Base models (API calls): ${baseToModels.size}`);

  const out: Record<string, { image: string | null; images: string[] }> = {};
  let calls = 0;
  for (const [base, variants] of baseToModels) {
    calls++;
    process.stdout.write(`[${calls}/${baseToModels.size}] ${base} ... `);
    const photos = await fetchPhotosForModel(make, base);
    console.log(photos.length ? `${photos.length} photos` : 'none');
    for (const v of variants) {
      out[v] = { image: photos[0] || null, images: photos };
    }
    await sleep(400); // be gentle on rate limit
  }

  const outPath = path.join(process.cwd(), 'scripts', '_mc_photos.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  const withPhotos = Object.values(out).filter(v => v.image).length;
  console.log(`\nWrote ${outPath}: ${withPhotos}/${Object.keys(out).length} models have a photo. API calls used: ${calls}`);
}

main().catch(e => { console.error(e); process.exit(1); });
