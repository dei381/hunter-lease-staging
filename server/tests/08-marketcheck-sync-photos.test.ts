import { afterEach, describe, expect, it, vi } from 'vitest';
import { MarketcheckSyncService } from '../services/MarketcheckSyncService';

describe('MarketcheckSyncService photo sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates a diff for existing trims when only photos are missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        listings: [
          {
            build: { trim: 'SE' },
            msrp: 30000,
            finance_details: {
              lease_details: {
                money_factor: '0.002',
                residual_value: '18000',
                rebates: 0,
              },
            },
            media: {
              photo_links: [
                'https://images.example.com/camry-main.jpg',
                'https://images.example.com/camry-side.jpg',
                'https://images.example.com/camry-rear.jpg',
              ],
            },
            dealer: { name: 'Example Dealer' },
          },
        ],
      }),
    }));

    const diff = await MarketcheckSyncService.fetchDiff(
      'test-key',
      {
        makes: [
          {
            name: 'Toyota',
            models: [
              {
                name: 'Camry',
                imageUrl: null,
                trims: [
                  {
                    name: 'SE',
                    msrp: 30000,
                    mf: 0.002,
                    rv36: 0.6,
                    leaseCash: 0,
                    photoLinks: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      ['Toyota'],
      ['Camry'],
      { msrp: false, mf: false, rv: false, rebates: false }
    );

    expect(diff.cars).toHaveLength(1);
    expect(diff.cars[0]).toMatchObject({
      make: 'Toyota',
      model: 'Camry',
      trim: 'SE',
      changes: {
        modelImageUrl: {
          old: null,
          new: 'https://images.example.com/camry-side.jpg',
        },
        photoLinks: {
          old: [],
          new: [
            'https://images.example.com/camry-side.jpg',
            'https://images.example.com/camry-rear.jpg',
          ],
        },
      },
    });
  });

  it('applies Marketcheck photo changes to existing models and trims', async () => {
    const carDb = {
      makes: [
        {
          name: 'Toyota',
          models: [
            {
              name: 'Camry',
              imageUrl: null,
              trims: [
                {
                  name: 'SE',
                  msrp: 30000,
                  mf: 0.002,
                  rv36: 0.6,
                  leaseCash: 0,
                  photoLinks: [],
                },
              ],
            },
          ],
        },
      ],
    };

    const applied = await MarketcheckSyncService.applyDiff(
      carDb,
      {
        cars: [
          {
            make: 'Toyota',
            model: 'Camry',
            trim: 'SE',
            changes: {
              modelImageUrl: {
                old: null,
                new: 'https://images.example.com/camry-side.jpg',
              },
              photoLinks: {
                old: [],
                new: [
                  'https://images.example.com/camry-side.jpg',
                  'https://images.example.com/camry-rear.jpg',
                ],
              },
            },
          },
        ],
      },
      null
    );

    expect(applied).toBe(1);
    expect(carDb.makes[0].models[0].imageUrl).toBe('https://images.example.com/camry-side.jpg');
    expect(carDb.makes[0].models[0].trims[0].photoLinks).toEqual([
      'https://images.example.com/camry-side.jpg',
      'https://images.example.com/camry-rear.jpg',
    ]);
  });
});