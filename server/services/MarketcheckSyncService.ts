
function normalizePhotoLinks(photoLinks: unknown): string[] {
  if (!Array.isArray(photoLinks)) return [];

  const normalized: string[] = [];
  for (const value of photoLinks) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (!trimmed || !trimmed.startsWith('http') || normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
    if (normalized.length >= 10) break;
  }

  return normalized;
}

function samePhotoLinks(left: unknown, right: unknown): boolean {
  const a = normalizePhotoLinks(left);
  const b = normalizePhotoLinks(right);
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function getListingPhotoLinks(listing: any): string[] {
  return normalizePhotoLinks((listing.media?.photo_links || []).slice(1, 11));
}

export class MarketcheckSyncService {
  static async fetchDiff(apiKey: string, carDb: any, targetMakes?: string[], targetModels?: string[], syncOptions?: any) {
    const diff: any[] = [];
    const dealersMap = new Map<string, any>();
    const incentivesMap = new Map<string, any>();
    const dealerDiscountsMap = new Map<string, any>();

    const makesToProcess = targetMakes && targetMakes.length > 0
      ? carDb.makes.filter((m: any) => targetMakes.includes(m.name))
      : carDb.makes;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Helper to find most common value (mode)
    const getMode = (arr: number[]) => {
      const valid = arr.filter(v => v > 0);
      if (valid.length === 0) return 0;
      const counts = valid.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      return parseFloat(Object.keys(counts).reduce((a, b) => counts[parseFloat(a)] > counts[parseFloat(b)] ? a : b));
    };

    for (const makeObj of makesToProcess) {
      const modelsToProcess = targetModels && targetModels.length > 0
        ? (makeObj.models || []).filter((m: any) => targetModels.includes(m.name))
        : (makeObj.models || []);

      // Discovery mode: when a brand has no models, query MarketCheck to discover them
      if (modelsToProcess.length === 0) {
        try {
          const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=${encodeURIComponent(makeObj.name)}&zip=90012&radius=100&rows=50`;
          const res = await fetch(url);
          await sleep(300);

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Marketcheck discovery for ${makeObj.name}: ${res.status} ${errText}`);
            throw new Error(`Marketcheck API Error (${res.status}) for ${makeObj.name}: ${errText}`);
          }

          const data: any = await res.json();
          const discoveredModels = new Map<string, Map<string, {
            msrp: number;
            mf: number[];
            rv: number[];
            photos: string[];
            modelImageUrl: string | null;
          }>>();

          for (const listing of data.listings || []) {
            const dealer = listing.dealer;
            if (dealer && dealer.name && !dealersMap.has(dealer.id || dealer.name)) {
              dealersMap.set(dealer.id || dealer.name, {
                name: dealer.name,
                street: dealer.street || '',
                city: dealer.city || '',
                state: dealer.state || '',
                zip: dealer.zip || '',
                phone: dealer.phone || '',
                website: dealer.website || ''
              });
            }

            const modelName = listing.build?.model || '';
            const trimName = listing.build?.trim || 'Base';
            if (!modelName) continue;

            let msrp = listing.msrp || 0;
            if (typeof msrp === 'string') msrp = parseFloat(msrp.replace(/[^0-9.]/g, ''));
            if (msrp > 0 && msrp < 1000) msrp = msrp * 1000;

            let price = listing.price || 0;
            if (typeof price === 'string') price = parseFloat(price.replace(/[^0-9.]/g, ''));
            if (price > 0 && price < 1000) price = price * 1000;

            if (msrp === 0 && price > 0) msrp = price;

            const lease = listing.finance_details?.lease_details;
            let mf = lease?.money_factor ? parseFloat(lease.money_factor) : 0;
            let rvValue = lease?.residual_value ? parseFloat(lease.residual_value) : 0;
            let rv = (rvValue > 0 && msrp > 0) ? rvValue / msrp : 0;

            // Extract photos (skip first photo - often has dealer branding)
            const photoLinks = getListingPhotoLinks(listing);
            const modelImageUrl = photoLinks[0] || null;

            if (msrp > 0) {
              if (!discoveredModels.has(modelName)) {
                discoveredModels.set(modelName, new Map());
              }
              const trimMap = discoveredModels.get(modelName)!;
              if (!trimMap.has(trimName)) {
                trimMap.set(trimName, {
                  msrp,
                  mf: [mf],
                  rv: [rv],
                  photos: [...photoLinks],
                  modelImageUrl,
                });
              } else {
                const existing = trimMap.get(trimName)!;
                if (mf > 0) existing.mf.push(mf);
                if (rv > 0) existing.rv.push(rv);
                if (!existing.modelImageUrl && modelImageUrl) existing.modelImageUrl = modelImageUrl;
                // Collect unique photos
                for (const url of photoLinks) {
                  if (existing.photos.length < 15 && !existing.photos.includes(url)) {
                    existing.photos.push(url);
                  }
                }
              }
            }
          }

          for (const [modelName, trimMap] of discoveredModels) {
            for (const [trimName, apiData] of trimMap) {
              const finalMf = getMode(apiData.mf);
              const finalRv = getMode(apiData.rv);
              diff.push({
                make: makeObj.name,
                model: modelName,
                trim: trimName,
                isNew: true,
                photos: apiData.photos || [],
                modelImageUrl: apiData.modelImageUrl || apiData.photos?.[0] || null,
                changes: {
                  msrp: { old: 0, new: apiData.msrp },
                  ...(finalMf > 0 ? { mf: { old: 0, new: finalMf } } : {}),
                  ...(finalRv > 0 ? { rv: { old: 0, new: parseFloat(finalRv.toFixed(2)) } } : {})
                }
              });
            }
          }
        } catch (e: any) {
          console.error(`Error discovering ${makeObj.name}`, e);
          throw e;
        }
        continue;
      }

      for (const modelObj of modelsToProcess) {
        try {
          let queryModel = modelObj.name;
          if (makeObj.name === 'Lexus') {
            const base = modelObj.name.split(' ')[0]; // e.g., "NX" from "NX 350"
            queryModel = `${base},${base} Hybrid,${base} PHEV`;
          }

          // SoCal Targeting: zip=90012 (LA) & radius=100 (covers down to San Diego)
          const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=${encodeURIComponent(makeObj.name)}&model=${encodeURIComponent(queryModel)}&zip=90012&radius=100&rows=50`;
          const res = await fetch(url);
          
          // Rate limiting protection
          await sleep(300);

          if (!res.ok) {
            const errText = await res.text();
            console.error(`Marketcheck API error for ${makeObj.name} ${modelObj.name}: ${res.status} ${errText}`);
            throw new Error(`Marketcheck API Error (${res.status}) for ${makeObj.name} ${modelObj.name}: ${errText}`);
          }
          const data: any = await res.json();
          
          const trimData = new Map<string, any>();
          let modelImageUrl: string | null = null;
          
          for (const listing of data.listings || []) {
            // Extract Dealer
            const dealer = listing.dealer;
            if (dealer && dealer.name && !dealersMap.has(dealer.id || dealer.name)) {
              dealersMap.set(dealer.id || dealer.name, {
                name: dealer.name,
                street: dealer.street || '',
                city: dealer.city || '',
                state: dealer.state || '',
                zip: dealer.zip || '',
                phone: dealer.phone || '',
                website: dealer.website || ''
              });
            }

            const trimName = listing.build?.trim || 'Base';
            let msrp = listing.msrp || 0;
            if (typeof msrp === 'string') msrp = parseFloat(msrp.replace(/[^0-9.]/g, ''));
            if (msrp > 0 && msrp < 1000) msrp = msrp * 1000; // Fix 36.695 issue
            
            let price = listing.price || 0;
            if (typeof price === 'string') price = parseFloat(price.replace(/[^0-9.]/g, ''));
            if (price > 0 && price < 1000) price = price * 1000;

            if (msrp === 0 && price > 0) msrp = price;
            
            const lease = listing.finance_details?.lease_details;
            let mf = lease?.money_factor ? parseFloat(lease.money_factor) : 0;
            let rvValue = lease?.residual_value ? parseFloat(lease.residual_value) : 0;
            let rv = (rvValue > 0 && msrp > 0) ? rvValue / msrp : 0;
            
            let rebates = parseFloat(listing.rebates || listing.finance_details?.lease_details?.rebates || 0);
            if (isNaN(rebates)) rebates = 0;
            let isCalculatedDiscount = false;
            if (rebates === 0 && msrp > 0 && price > 0 && msrp > price) {
              rebates = msrp - price;
              isCalculatedDiscount = true;
            }

            // Extract Incentives from seller_comments or just use the total rebate
            if (syncOptions?.rebates !== false && rebates > 0) {
              const comments = (listing.seller_comments || '').toLowerCase();
              const incentiveTypes = [];
              if (comments.includes('loyalty')) incentiveTypes.push('Лояльность (Loyalty)');
              if (comments.includes('military')) incentiveTypes.push('Военным (Military)');
              if (comments.includes('college')) incentiveTypes.push('Выпускникам (College Grad)');
              if (comments.includes('conquest')) incentiveTypes.push('Переход от конкурентов (Conquest)');
              if (comments.includes('first responder')) incentiveTypes.push('Службам спасения (First Responder)');
              
              if (incentiveTypes.length === 0) {
                if (isCalculatedDiscount) {
                  incentiveTypes.push('Скидка для пользователей Hunter Lease');
                } else {
                  incentiveTypes.push('Скидка от производителя');
                }
              }

              for (const type of incentiveTypes) {
                const isDealerDiscount = type === 'Скидка для пользователей Hunter Lease';
                const key = `${makeObj.name}-${modelObj.name}-${trimName}-${type}`;
                
                if (isDealerDiscount) {
                  if (!dealerDiscountsMap.has(key)) {
                    dealerDiscountsMap.set(key, {
                      make: makeObj.name,
                      model: modelObj.name,
                      trim: trimName,
                      amount: Math.round(rebates * 100),
                      isActive: true
                    });
                  }
                } else {
                  if (!incentivesMap.has(key)) {
                    incentivesMap.set(key, {
                      make: makeObj.name,
                      model: modelObj.name,
                      trim: trimName,
                      type: type,
                      amountCents: Math.round(rebates * 100), // Approximate, as we don't know the exact split
                      dealApplicability: 'lease'
                    });
                  }
                }
              }
            }

            // Extract photos from existing model listings too
            const listingPhotos = getListingPhotoLinks(listing);
            if (!modelImageUrl && listingPhotos.length > 0) {
              modelImageUrl = listingPhotos[0];
            }

            if (msrp > 0) {
              if (!trimData.has(trimName)) {
                trimData.set(trimName, { msrp, mf: [mf], rv: [rv], rebates: [rebates], photos: [...listingPhotos] });
              } else {
                const existing = trimData.get(trimName);
                if (mf > 0) existing.mf.push(mf);
                if (rv > 0) existing.rv.push(rv);
                if (rebates > 0) existing.rebates.push(rebates);
                for (const url of listingPhotos) {
                  if ((existing.photos || []).length < 15 && !(existing.photos || []).includes(url)) {
                    (existing.photos = existing.photos || []).push(url);
                  }
                }
              }
            }
          }

          // Compare with DB
          for (const [trimName, apiData] of trimData.entries()) {
            // Strict Trim Matching (Word Boundary)
            const dbTrim = modelObj.trims?.find((t: any) => {
              const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex1 = new RegExp(`\\b${escapeRegExp(t.name)}\\b`, 'i');
              const regex2 = new RegExp(`\\b${escapeRegExp(trimName)}\\b`, 'i');
              return regex1.test(trimName) || regex2.test(t.name);
            });
            
            if (dbTrim) {
              const changes: any = {};
              
              const finalMf = getMode(apiData.mf);
              const finalRv = getMode(apiData.rv);
              const finalRebates = getMode(apiData.rebates);
              const currentPhotoLinks = normalizePhotoLinks(dbTrim.photoLinks);
              const nextPhotoLinks = normalizePhotoLinks(apiData.photos);

              if (syncOptions?.msrp !== false && apiData.msrp > 0 && apiData.msrp !== dbTrim.msrp) {
                changes.msrp = { old: dbTrim.msrp || 0, new: apiData.msrp };
              }
              if (syncOptions?.mf !== false && finalMf > 0 && finalMf !== dbTrim.mf) {
                changes.mf = { old: dbTrim.mf || 0, new: finalMf };
              }
              if (syncOptions?.rv !== false && finalRv > 0 && Math.abs(finalRv - (dbTrim.rv36 || 0)) > 0.02) {
                changes.rv = { old: dbTrim.rv36 || 0, new: parseFloat(finalRv.toFixed(2)) };
              }
              if (syncOptions?.rebates !== false && finalRebates > 0 && finalRebates !== dbTrim.leaseCash) {
                changes.leaseCash = { old: dbTrim.leaseCash || 0, new: finalRebates };
              }
              if (nextPhotoLinks.length > 0 && !samePhotoLinks(currentPhotoLinks, nextPhotoLinks)) {
                changes.photoLinks = { old: currentPhotoLinks, new: nextPhotoLinks };
              }
              if (modelImageUrl && modelObj.imageUrl !== modelImageUrl) {
                changes.modelImageUrl = { old: modelObj.imageUrl || null, new: modelImageUrl };
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
        } catch (e: any) {
          console.error(`Error fetching ${makeObj.name} ${modelObj.name}`, e);
          throw e; // Rethrow all errors so the user sees them immediately
        }
      }
    }
    return {
      cars: diff,
      dealers: Array.from(dealersMap.values()),
      incentives: Array.from(incentivesMap.values()),
      dealerDiscounts: Array.from(dealerDiscountsMap.values())
    };
  }

  static async applyDiff(carDb: any, diff: any, prisma: any) {
    let appliedCount = 0;
    
    const cars = Array.isArray(diff) ? diff : (diff.cars || []);
    const dealers = Array.isArray(diff) ? [] : (diff.dealers || []);
    const incentives = Array.isArray(diff) ? [] : (diff.incentives || []);
    const dealerDiscounts = Array.isArray(diff) ? [] : (diff.dealerDiscounts || []);

    // Apply car changes
    if (Array.isArray(cars)) {
      for (const item of cars) {
        const makeObj = carDb.makes?.find((m: any) => m.name === item.make);
        if (!makeObj) continue;

        // Handle newly discovered models/trims
        if (item.isNew) {
          let modelObj = makeObj.models?.find((m: any) => m.name === item.model);
          if (!modelObj) {
            modelObj = {
              id: item.model.toLowerCase().replace(/\s+/g, '-'),
              name: item.model,
              class: 'Unknown',
              msrpRange: '',
              years: [new Date().getFullYear()],
              imageUrl: item.modelImageUrl || item.photos?.[0] || null,
              mf: 0.00150,
              rv36: 0.60,
              baseAPR: 4.9,
              leaseCash: 0,
              trims: []
            };
            makeObj.models = makeObj.models || [];
            makeObj.models.push(modelObj);
          }
          if (item.modelImageUrl || item.photos?.[0]) {
            modelObj.imageUrl = item.modelImageUrl || item.photos?.[0] || null;
          }
          const existingTrim = modelObj.trims?.find((t: any) => t.name === item.trim);
          if (!existingTrim) {
            modelObj.trims = modelObj.trims || [];
            modelObj.trims.push({
              name: item.trim,
              msrp: item.changes.msrp?.new || 0,
              mf: item.changes.mf?.new || 0,
              apr: 0,
              rv36: item.changes.rv?.new || 0,
              leaseCash: 0,
              photoLinks: item.photos || []
            });
            appliedCount++;
          }
          continue;
        }

        const modelObj = makeObj.models?.find((m: any) => m.name === item.model);
        if (!modelObj) continue;
        if (item.changes.modelImageUrl?.new) {
          modelObj.imageUrl = item.changes.modelImageUrl.new;
        }
        const trimObj = modelObj.trims?.find((t: any) => t.name === item.trim);
        if (!trimObj) continue;

        if (item.changes.msrp?.new) trimObj.msrp = item.changes.msrp.new;
        if (item.changes.mf?.new) trimObj.mf = item.changes.mf.new;
        if (item.changes.rv?.new) trimObj.rv36 = item.changes.rv.new;
        if (item.changes.leaseCash?.new) trimObj.leaseCash = item.changes.leaseCash.new;
        if (item.changes.photoLinks?.new) trimObj.photoLinks = normalizePhotoLinks(item.changes.photoLinks.new);
        appliedCount++;
      }
    }

    // Apply dealers
    if (Array.isArray(dealers) && prisma) {
      for (const dealer of dealers) {
        try {
          const existingDealer = await prisma.dealerPartner.findFirst({
            where: { name: dealer.name }
          });
          
          if (!existingDealer) {
            await prisma.dealerPartner.create({
              data: {
                name: dealer.name,
                address: `${dealer.street}, ${dealer.city}, ${dealer.state} ${dealer.zip}`,
                phone: dealer.phone,
                isActive: true
              }
            });
            appliedCount++;
          }
        } catch (e) {
          console.error('Failed to save dealer:', e);
        }
      }
    }

    // Apply incentives
    if (Array.isArray(incentives) && prisma) {
      for (const incentive of incentives) {
        try {
          const existingIncentive = await prisma.oemIncentiveProgram.findFirst({
            where: {
              name: `${incentive.make} ${incentive.model} ${incentive.type}`,
              make: incentive.make,
              model: incentive.model,
              trim: incentive.trim,
              type: incentive.type
            }
          });

          if (!existingIncentive) {
            await prisma.oemIncentiveProgram.create({
              data: {
                name: `${incentive.make} ${incentive.model} ${incentive.type}`,
                amountCents: incentive.amountCents,
                type: incentive.type,
                dealApplicability: incentive.dealApplicability,
                make: incentive.make,
                model: incentive.model,
                trim: incentive.trim,
                verifiedByAdmin: true
              }
            });
            appliedCount++;
          } else if (existingIncentive.amountCents !== incentive.amountCents) {
            await prisma.oemIncentiveProgram.update({
              where: { id: existingIncentive.id },
              data: { amountCents: incentive.amountCents }
            });
            appliedCount++;
          }
        } catch (e) {
          console.error('Failed to save incentive:', e);
        }
      }
    }

    // Apply dealer discounts
    if (Array.isArray(dealerDiscounts) && prisma) {
      for (const discount of dealerDiscounts) {
        try {
          const existingDiscount = await prisma.dealerAdjustment.findFirst({
            where: {
              make: discount.make,
              model: discount.model,
              trim: discount.trim
            }
          });

          if (!existingDiscount) {
            await prisma.dealerAdjustment.create({
              data: {
                make: discount.make,
                model: discount.model,
                trim: discount.trim,
                amount: discount.amount,
                isActive: true,
                startsAt: new Date(),
                endsAt: null
              }
            });
            appliedCount++;
          } else if (existingDiscount.amount !== discount.amount) {
            await prisma.dealerAdjustment.update({
              where: { id: existingDiscount.id },
              data: { amount: discount.amount }
            });
            appliedCount++;
          }
        } catch (e) {
          console.error('Failed to save dealer discount:', e);
        }
      }
    }

    return appliedCount;
  }
}
