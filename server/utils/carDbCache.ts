import { PrismaClient } from '@prisma/client';
import { getCarDb } from './carDb';

const prisma = new PrismaClient();

let cachedCarDbMaps: {
  makeMap: Map<string, any>;
  modelMap: Map<string, any>;
  trimMap: Map<string, any>;
  lastUpdated: number;
} | null = null;

let cachedCarPhotosMap: {
  map: Map<string, any[]>;
  lastUpdated: number;
} | null = null;

const CACHE_TTL = 60000; // 1 minute

export const getCachedCarDbMaps = async () => {
  const now = Date.now();
  if (cachedCarDbMaps && (now - cachedCarDbMaps.lastUpdated < CACHE_TTL)) {
    return cachedCarDbMaps;
  }

  const CAR_DB = await getCarDb();
  const makeMap = new Map();
  const modelMap = new Map();
  const trimMap = new Map();

  if ((CAR_DB as any).makes) {
    for (const make of (CAR_DB as any).makes) {
      const makeKey = make.name?.toLowerCase();
      if (!makeKey) continue;
      makeMap.set(makeKey, make);
      if (make.models) {
        for (const model of make.models) {
          const modelKey = `${makeKey}-${model.name?.toLowerCase()}`;
          modelMap.set(modelKey, model);
          if (model.trims) {
            for (const trim of model.trims) {
              const trimKey = `${modelKey}-${trim.name?.toLowerCase()}`;
              trimMap.set(trimKey, trim);
            }
          }
        }
      }
    }
  }

  cachedCarDbMaps = { makeMap, modelMap, trimMap, lastUpdated: now };
  return cachedCarDbMaps;
};

export const getCachedCarPhotosMap = async () => {
  const now = Date.now();
  if (cachedCarPhotosMap && (now - cachedCarPhotosMap.lastUpdated < CACHE_TTL)) {
    return cachedCarPhotosMap;
  }

  const record = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
  const CAR_PHOTOS = record?.value ? JSON.parse(record.value as string) : [];
  
  const map = new Map();
  for (const photo of CAR_PHOTOS) {
    const key = `${photo.makeId}-${photo.modelId}`;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(photo);
  }

  cachedCarPhotosMap = { map, lastUpdated: now };
  return cachedCarPhotosMap;
};
