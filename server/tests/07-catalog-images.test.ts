import { describe, expect, it } from 'vitest';
import { findCatalogPhotoRecord, resolveCatalogImageUrl } from '../utils/catalogImage';

describe('catalog image resolution', () => {
  it('prefers Marketcheck model image over manual car_photos fallback', () => {
    const imageUrl = resolveCatalogImageUrl({
      carPhotos: [
        { makeId: 'toyota', modelId: 'camry', imageUrl: 'https://images.example.com/camry.jpg', isDefault: true },
      ],
      makeName: 'Toyota',
      rawModelName: 'Toyota Camry',
      modelName: 'Camry',
      trimPhotos: [],
      modelImageUrl: 'https://marketcheck.example.com/camry.jpg',
    });

    expect(imageUrl).toBe('https://marketcheck.example.com/camry.jpg');
  });

  it('matches records stored with raw model slug', () => {
    const photo = findCatalogPhotoRecord(
      [
        { makeId: 'toyota', modelId: 'toyota-camry', imageUrl: 'https://images.example.com/camry-raw.jpg', isDefault: true },
      ],
      'Toyota',
      'Toyota Camry',
      'Camry'
    );

    expect(photo?.imageUrl).toBe('https://images.example.com/camry-raw.jpg');
  });

  it('falls back to car_photos when Marketcheck image is missing', () => {
    const imageUrl = resolveCatalogImageUrl({
      carPhotos: [
        { makeId: 'toyota', modelId: 'camry', imageUrl: 'https://images.example.com/camry.jpg', isDefault: true },
      ],
      makeName: 'Toyota',
      rawModelName: 'Toyota Camry',
      modelName: 'Camry',
      trimPhotos: [],
      modelImageUrl: null,
    });

    expect(imageUrl).toBe('https://images.example.com/camry.jpg');
  });

  it('keeps trim photo as highest priority', () => {
    const imageUrl = resolveCatalogImageUrl({
      carPhotos: [
        { makeId: 'toyota', modelId: 'camry', imageUrl: 'https://images.example.com/camry.jpg', isDefault: true },
      ],
      makeName: 'Toyota',
      rawModelName: 'Toyota Camry',
      modelName: 'Camry',
      trimPhotos: ['https://images.example.com/trim.jpg'],
      modelImageUrl: 'https://broken.example.com/camry.jpg',
    });

    expect(imageUrl).toBe('https://images.example.com/trim.jpg');
  });
});