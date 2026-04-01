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

export const getCarImage = (
  photos: CarPhoto[],
  makeId: any,
  modelId: any,
  year?: number,
  colorId?: string
): string => {
  if (!photos || photos.length === 0) return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800';

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

  // 6. Fallback to placeholder
  return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800';
};
