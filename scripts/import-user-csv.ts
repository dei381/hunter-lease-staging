import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getCarDb, saveCarDb } from '../server/utils/carDb.js';

const prisma = new PrismaClient();

async function importCsv() {
  const filePath = path.join(process.cwd(), 'data.csv');
  const csvText = fs.readFileSync(filePath, 'utf8');
  
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const carDb = await getCarDb();
  if (!carDb.makes) carDb.makes = [];

  for (const row of parsed.data as any[]) {
    const makeName = row.make;
    const modelName = row.model;
    const trimName = row.trim;
    const msrp = parseFloat(row.msrp);
    
    if (!makeName || !modelName || !trimName) continue;
    
    const makeId = makeName.toLowerCase().replace(/\s+/g, '-');
    const modelId = modelName.toLowerCase().replace(/\s+/g, '-');
    const year = parseInt(row.year) || new Date().getFullYear();

    let make = carDb.makes.find((m: any) => m.id === makeId);
    if (!make) {
      make = {
        id: makeId,
        name: makeName,
        tiers: [
          { id: "t1", label: "Tier 1", score: "740+", aprAdd: 0, mfAdd: 0, cls: "r1" },
          { id: "t2", label: "Tier 2", score: "700–739", aprAdd: 1.5, mfAdd: 0.00040, cls: "r2" },
          { id: "t3", label: "Tier 3", score: "660–699", aprAdd: 4.5, mfAdd: 0.00120, cls: "r3" },
          { id: "t4", label: "Tier 4", score: "620–659", aprAdd: 9.0, mfAdd: 0.00240, cls: "r4" }
        ],
        baseMF: 0.002,
        baseAPR: 6.9,
        models: []
      };
      carDb.makes.push(make);
    }

    let model = make.models.find((m: any) => m.id === modelId);
    if (!model) {
      model = {
        id: modelId,
        name: modelName,
        class: 'Unknown',
        msrpRange: '',
        years: [year],
        imageUrl: null,
        mf: 0.0015,
        rv36: 0.60,
        baseAPR: 4.9,
        leaseCash: 0,
        trims: []
      };
      make.models.push(model);
    } else {
       if (!model.years.includes(year)) {
           model.years.push(year);
       }
    }

    let trim = model.trims.find((t: any) => t.name === trimName);
    if (!trim) {
      parseFloat(row.money_factor)
      trim = {
        name: trimName,
        msrp,
        mf: parseFloat(row.money_factor) || 0.0015,
        apr: parseFloat(row.apr) || 4.9,
        rv36: (parseFloat(row.residual_percentage) || 60) / 100, // convert 75 to 0.75
        leaseCash: 0
      };
      model.trims.push(trim);
    } else {
        // Update
        trim.msrp = msrp || trim.msrp;
        if (row.money_factor) trim.mf = parseFloat(row.money_factor);
        if (row.apr) trim.apr = parseFloat(row.apr);
        if (row.residual_percentage) trim.rv36 = parseFloat(row.residual_percentage) / 100;
    }
  }

  // Save via our new relational sync
  await saveCarDb(carDb);
  
  // also write to site settings for legacy just in case
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(carDb) },
    create: { id: 'car_db', data: JSON.stringify(carDb) }
  });

  console.log('Database updated from CSV!');
}

importCsv()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
