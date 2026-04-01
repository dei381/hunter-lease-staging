import { PrismaClient } from '@prisma/client';
import { getBodyStyle, getFuelType, getDetailedSpecs, getCategorizedFeatures, getOwnerVerdict } from './server/data/deals';

const prisma = new PrismaClient();

const getVal = (field: any, fallback: number = 0): number => {
  if (field === undefined || field === null) return fallback;
  if (typeof field === 'number') return field;
  const parsed = parseFloat(field.toString().replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? fallback : parsed;
};

async function test() {
  const dbDeals = await prisma.dealRecord.findMany({
    where: {
      OR: [
        { reviewStatus: 'APPROVED' },
        { publishStatus: 'PUBLISHED' }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  const CAR_DB = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } }).then(r => r ? JSON.parse(r.data) : {});
  const CAR_PHOTOS = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } }).then(r => r ? JSON.parse(r.data) : []);

  const taxRate = 0.095;

  const mappedDeals = (dbDeals as any[]).map(deal => {
    const data = deal.financialData ? JSON.parse(deal.financialData) : null;
    if (!data) return null;

    const hunterDiscount = data.hunterDiscount?.isGlobal ? (data.hunterDiscount.value || 0) : 0;
    const manufacturerRebate = data.manufacturerRebate?.isGlobal ? (data.manufacturerRebate.value || 0) : 0;
    const totalGlobalSavings = hunterDiscount + manufacturerRebate;

    let msrp = getVal(data.msrp);
    let mf = getVal(data.moneyFactor || data.mf, 0.002);
    let rv = getVal(data.residualValue || data.rv, 0.5);
    let leaseCash = getVal(data.leaseCash || data.rebates, 0);
    let term = getVal(data.term, 36);
    let down = getVal(data.down !== undefined ? data.down : data.dueAtSigning, 3000);
    let savings = getVal(data.savings, 0);

    const effectiveSavings = totalGlobalSavings > 0 ? totalGlobalSavings : savings;
    let type = data.type || 'lease';

    if (data.make && data.model && data.trim) {
      const makeObj = (CAR_DB as any).makes?.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
      if (makeObj) {
        const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase());
        if (modelObj) {
          const trimObj = modelObj.trims?.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase());
          if (trimObj) {
            msrp = trimObj.msrp || msrp;
            mf = trimObj.mf || mf;
            rv = trimObj.rv36 || rv;
            leaseCash = trimObj.leaseCash || leaseCash;
          }
        }
      }
    }

    let payment = getVal(data.monthlyPayment || data.payment, 0);
    
    if (payment <= 0) {
      if (type === 'lease') {
        const acqFee = 650;
        const docFee = 85;
        const rvAmt = rv > 100 ? rv : msrp * (rv > 1 ? rv / 100 : rv);
        const sellingPrice = msrp - effectiveSavings;
        
        const approxCapCost = sellingPrice - down + acqFee + docFee;
        const approxDepreciation = (approxCapCost - rvAmt) / term;
        const approxRent = (approxCapCost + rvAmt) * mf;
        const approxFirstPayment = (approxDepreciation + approxRent) * (1 + taxRate);
        
        const capReduction = Math.max(0, down - approxFirstPayment - acqFee - docFee - (acqFee + docFee) * taxRate);
        const capCost = sellingPrice - capReduction + acqFee + docFee;
        
        const depreciation = (capCost - rvAmt) / term;
        const rentCharge = (capCost + rvAmt) * mf;
        const baseLeasePay = depreciation + rentCharge;
        payment = Math.round(baseLeasePay * (1 + taxRate));
      } else {
        const docFee = 85;
        const apr = getVal(data.apr, 6.9);
        const amountFinanced = (msrp - effectiveSavings) + docFee + ((msrp - effectiveSavings) * taxRate) - down;
        const r = apr / 100 / 12;
        payment = Math.round((amountFinanced * (r * Math.pow(1 + r, term))) / (Math.pow(1 + r, term) - 1));
      }
    }

    let rvPercent = '0%';
    if (rv > 0) {
      if (rv < 1) {
        rvPercent = (rv * 100).toFixed(0) + '%';
      } else if (rv <= 100) {
        rvPercent = rv.toFixed(0) + '%';
      } else if (msrp > 0) {
        rvPercent = (rv / msrp * 100).toFixed(0) + '%';
      } else {
        rvPercent = rv.toString();
      }
    }

    let imageUrl = data.image || null;
    let bodyStyle = data.bodyStyle || 'Auto';
    let fuelType = data.fuelType || 'Gas';
    let driveType = data.driveType || 'FWD';
    let seats = data.seats || 5;
    let features = data.features || [];
    let featuresRu = data.featuresRu || [];
    
    if (data.make && data.model) {
      const makeObj = (CAR_DB as any).makes?.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
      if (makeObj) {
        const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase());
        if (modelObj) {
          const photo = CAR_PHOTOS.find((p: any) => p.makeId === makeObj.id && p.modelId === modelObj.id && p.isDefault);
          if (photo) {
            imageUrl = photo.imageUrl;
          }
          bodyStyle = getBodyStyle(modelObj.class, modelObj.name);
          fuelType = getFuelType(modelObj.class, data.trim || '');
          seats = (modelObj.class || '').includes('3-Row') || (modelObj.class || '').includes('Minivan') ? 7 : 5;
          
          if (data.trim) {
            const trimObj = modelObj.trims?.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase());
            if (trimObj && trimObj.feat) {
              driveType = trimObj.feat.includes('AWD') || trimObj.feat.includes('4x4') ? 'AWD' : 'FWD';
              features = trimObj.feat.split(' · ');
            }
          }
        }
      }
    }

    const { specs, specsRu } = getDetailedSpecs(data.model || '', data.trim || '', bodyStyle, fuelType);
    const catFeatures = getCategorizedFeatures(data.make || '', data.model || '', data.trim || '');
    const isLuxury = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Land Rover'].includes(data.make || '');
    const verdict = getOwnerVerdict(data.make || '', data.model || '', data.trim || '', isLuxury);

    return {
      id: deal.id,
      type: type,
      payment,
      term,
      down,
      mf,
      rv,
      msrp,
      savings,
    };
  }).filter(Boolean);

  console.log(mappedDeals.length);
}

test().catch(console.error).finally(() => prisma.$disconnect());
