export interface CatalogPhotoRecord {
  makeId?: string | null;
  modelId?: string | null;
  imageUrl?: string | null;
  isDefault?: boolean | null;
}

interface ResolveCatalogImageParams {
  carPhotos: CatalogPhotoRecord[];
  makeName: string;
  rawModelName: string;
  modelName: string;
  trimPhotos?: string[];
  modelImageUrl?: string | null;
}

const normalizePhotoKey = (value: string | null | undefined): string =>
  (value || '').toLowerCase().trim().replace(/\s+/g, '-');

export function findCatalogPhotoRecord(
  carPhotos: CatalogPhotoRecord[],
  makeName: string,
  rawModelName: string,
  modelName: string
): CatalogPhotoRecord | null {
  const makeKey = normalizePhotoKey(makeName);
  const modelKeys = Array.from(new Set([
    normalizePhotoKey(modelName),
    normalizePhotoKey(rawModelName)
  ].filter(Boolean)));

  if (modelKeys.length === 0) {
    return null;
  }

  const matches = carPhotos.filter((photo) =>
    normalizePhotoKey(photo.makeId) === makeKey &&
    modelKeys.includes(normalizePhotoKey(photo.modelId)) &&
    !!photo.imageUrl
  );

  return matches.find((photo) => photo.isDefault) || matches[0] || null;
}

export function resolveCatalogImageUrl({
  carPhotos,
  makeName,
  rawModelName,
  modelName,
  trimPhotos = [],
  modelImageUrl = null,
}: ResolveCatalogImageParams): string | null {
  const trimPhoto = trimPhotos.find(Boolean) || null;
  const matchedPhoto = findCatalogPhotoRecord(carPhotos, makeName, rawModelName, modelName);

  return trimPhoto || modelImageUrl || matchedPhoto?.imageUrl || null;
}