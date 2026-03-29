import fetch from 'node-fetch';

export class MarketcheckSyncService {
  static async fetchDiff(apiKey: string, carDb: any, targetMakes?: string[], targetModels?: string[]) {
    const diff: any[] = [];
    const makesToProcess = targetMakes && targetMakes.length > 0
      ? carDb.makes.filter((m: any) => targetMakes.includes(m.name))
      : carDb.makes;

    for (const makeObj of makesToProcess) {
      const modelsToProcess = targetModels && targetModels.length > 0
        ? (makeObj.models || []).filter((m: any) => targetModels.includes(m.name))
        : (makeObj.models || []);

      for (const modelObj of modelsToProcess) {
        try {
          const url = `https://mc-api.marketcheck.com/v2/search/cars/active?api_key=${apiKey}&car_type=new&make=${encodeURIComponent(makeObj.name)}&model=${encodeURIComponent(modelObj.name)}&rows=50`;
          const res = await fetch(url);
          if (!res.ok) continue;
          const data: any = await res.json();
          
          const trimData = new Map<string, any>();
          
          for (const listing of data.listings || []) {
            const trimName = listing.build?.trim || 'Base';
            let msrp = listing.msrp || listing.price || 0;
            if (typeof msrp === 'string') msrp = parseFloat(msrp.replace(/[^0-9.]/g, ''));
            if (msrp > 0 && msrp < 1000) msrp = msrp * 1000; // Fix 36.695 issue
            
            const lease = listing.finance_details?.lease_details;
            let mf = lease?.money_factor ? parseFloat(lease.money_factor) : 0;
            let rvValue = lease?.residual_value ? parseFloat(lease.residual_value) : 0;
            let rv = (rvValue > 0 && msrp > 0) ? rvValue / msrp : 0;
            
            let rebates = parseFloat(listing.rebates || listing.finance_details?.lease_details?.rebates || 0);

            if (msrp > 0) {
              if (!trimData.has(trimName)) {
                trimData.set(trimName, { msrp, mf, rv, rebates });
              } else {
                const existing = trimData.get(trimName);
                if (mf > 0 && existing.mf === 0) existing.mf = mf;
                if (rv > 0 && existing.rv === 0) existing.rv = rv;
                if (rebates > 0 && existing.rebates === 0) existing.rebates = rebates;
              }
            }
          }

          // Compare with DB
          for (const [trimName, apiData] of trimData.entries()) {
            const dbTrim = modelObj.trims?.find((t: any) => 
              trimName.toLowerCase().includes(t.name.toLowerCase()) || 
              t.name.toLowerCase().includes(trimName.toLowerCase())
            );
            
            if (dbTrim) {
              const changes: any = {};
              
              if (apiData.msrp > 0 && apiData.msrp !== dbTrim.msrp) {
                changes.msrp = { old: dbTrim.msrp || 0, new: apiData.msrp };
              }
              if (apiData.mf > 0 && apiData.mf !== dbTrim.mf) {
                changes.mf = { old: dbTrim.mf || 0, new: apiData.mf };
              }
              if (apiData.rv > 0 && Math.abs(apiData.rv - (dbTrim.rv36 || 0)) > 0.02) {
                changes.rv = { old: dbTrim.rv36 || 0, new: parseFloat(apiData.rv.toFixed(2)) };
              }
              if (apiData.rebates > 0 && apiData.rebates !== dbTrim.leaseCash) {
                changes.leaseCash = { old: dbTrim.leaseCash || 0, new: apiData.rebates };
              }

              if (Object.keys(changes).length > 0) {
                diff.push({
                  make: makeObj.name,
                  model: modelObj.name,
                  trim: dbTrim.name,
                  apiTrim: trimName,
                  changes
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error fetching ${makeObj.name} ${modelObj.name}`, e);
        }
      }
    }
    return diff;
  }

  static applyDiff(carDb: any, diff: any[]) {
    let appliedCount = 0;
    for (const item of diff) {
      const makeObj = carDb.makes?.find((m: any) => m.name === item.make);
      if (!makeObj) continue;
      const modelObj = makeObj.models?.find((m: any) => m.name === item.model);
      if (!modelObj) continue;
      const trimObj = modelObj.trims?.find((t: any) => t.name === item.trim);
      if (!trimObj) continue;

      if (item.changes.msrp?.new) trimObj.msrp = item.changes.msrp.new;
      if (item.changes.mf?.new) trimObj.mf = item.changes.mf.new;
      if (item.changes.rv?.new) trimObj.rv36 = item.changes.rv.new;
      if (item.changes.leaseCash?.new) trimObj.leaseCash = item.changes.leaseCash.new;
      appliedCount++;
    }
    return appliedCount;
  }
}
