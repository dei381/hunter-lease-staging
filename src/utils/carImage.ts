export interface CarPhoto {
  id: string;
  makeId: string;
  modelId: string;
  year: number;
  colorId: string;
  imageUrl: string;
  isDefault: boolean;
  createdAt: string;
}

// Neutral car-silhouette placeholder (inline SVG, light theme) shown when we have no real
// photo for a model. Replaces the old stock photo of a black sports car, which read as a
// fake/wrong car on a Hyundai listing — exactly the kind of thing this audience distrusts.
export const CAR_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480' viewBox='0 0 800 480'>` +
    `<rect width='800' height='480' fill='#eef0f2'/>` +
    `<g fill='none' stroke='#c2c8cf' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'>` +
    `<path d='M180 300 l40 -86 a40 40 0 0 1 36 -24 h288 a40 40 0 0 1 36 24 l40 86'/>` +
    `<path d='M150 300 h500 a16 16 0 0 1 16 16 v40 a16 16 0 0 1 -16 16 h-30 M180 372 h-30 a16 16 0 0 1 -16 -16 v-40 a16 16 0 0 1 16 -16'/>` +
    `<circle cx='262' cy='372' r='40' fill='#eef0f2'/><circle cx='538' cy='372' r='40' fill='#eef0f2'/>` +
    `</g></svg>`
  );

export const getCarImage = (
  photos: CarPhoto[],
  makeId: any,
  modelId: any,
  year?: number,
  colorId?: string
): string => {
  if (!photos || photos.length === 0) return CAR_IMAGE_PLACEHOLDER;

  const normalizedMakeId = (typeof makeId === 'string' ? makeId : makeId?.name || '').toLowerCase().replace(/\s+/g, '-');
  const normalizedModelId = (typeof modelId === 'string' ? modelId : modelId?.name || '').toLowerCase().replace(/\s+/g, '-');

  // 1. Try exact match (Make, Model, Year, Color)
  if (year && colorId) {
    const exactMatch = photos.find(p => 
      p.makeId === normalizedMakeId && 
      p.modelId === normalizedModelId && 
      p.year === year && 
      p.colorId.toLowerCase() === colorId.toLowerCase()
    );
    if (exactMatch) return exactMatch.imageUrl;
  }

  // 2. Try match (Make, Model, Year) with isDefault
  if (year) {
    const defaultForYear = photos.find(p => 
      p.makeId === normalizedMakeId && 
      p.modelId === normalizedModelId && 
      p.year === year && 
      p.isDefault
    );
    if (defaultForYear) return defaultForYear.imageUrl;

    // 3. Try any match for Year
    const anyForYear = photos.find(p => 
      p.makeId === normalizedMakeId && 
      p.modelId === normalizedModelId && 
      p.year === year
    );
    if (anyForYear) return anyForYear.imageUrl;
  }

  // 4. Try default for Model (any year)
  const defaultForModel = photos.find(p => 
    p.makeId === normalizedMakeId && 
    p.modelId === normalizedModelId && 
    p.isDefault
  );
  if (defaultForModel) return defaultForModel.imageUrl;

  // 5. Try any match for Model
  const anyForModel = photos.find(p => 
    p.makeId === normalizedMakeId && 
    p.modelId === normalizedModelId
  );
  if (anyForModel) return anyForModel.imageUrl;

  // 6. Fallback to the neutral placeholder
  return CAR_IMAGE_PLACEHOLDER;
};
