import { useState, useEffect } from 'react';

export interface MarketcheckListing {
  id: string;
  vin: string;
  heading: string;
  make: string;
  model: string;
  year: number;
  trim: string;
  price: number;
  msrp: number;
  miles: number;
  exterior_color: string;
  interior_color: string;
  dealer: {
    id: string;
    name: string;
    city: string;
    zip: string;
    phone: string;
  };
  media: {
    photo_links: string[];
  };
  source: 'marketcheck';
  status: 'active' | 'pending_review';
  updated_at: any;
  fuel_type?: string;
  body_style?: string;
  drive_type?: string;
  transmission?: string;
  engine?: string;
}

export const useMarketcheck = (params?: { make?: string, model?: string }) => {
  const [mcInventory, setMcInventory] = useState<MarketcheckListing[]>([]);
  const [mcTotalCount, setMcTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventory = async () => {
      setIsLoading(true);
      try {
        let url = '/api/marketcheck/search?rows=50';
        if (params?.make && params.make !== 'All') url += `&make=${encodeURIComponent(params.make)}`;
        if (params?.model && params.model !== 'All') url += `&model=${encodeURIComponent(params.model)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        const listings: MarketcheckListing[] = (data.listings || []).map((item: any) => ({
          id: item.id,
          vin: item.vin,
          heading: item.heading,
          make: item.build?.make || item.make,
          model: item.build?.model || item.model,
          year: item.build?.year || item.year,
          trim: item.build?.trim || item.trim,
          price: item.price,
          msrp: item.msrp || item.price,
          miles: item.miles,
          exterior_color: item.exterior_color,
          interior_color: item.interior_color,
          dealer: item.dealer,
          media: item.media,
          source: 'marketcheck',
          status: 'active',
          updated_at: new Date(),
          fuel_type: item.build?.fuel_type || item.fuel_type,
          body_style: item.build?.body_type || item.body_style,
          drive_type: item.build?.drivetrain || item.drive_type,
          transmission: item.build?.transmission || item.transmission,
          engine: item.build?.engine || item.engine
        }));
        
        setMcInventory(listings);
        setMcTotalCount(data.num_found || 0);
        setError(null);
      } catch (err) {
        console.error('Error fetching Marketcheck inventory:', err);
        setError('Failed to load live inventory');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [params?.make, params?.model]);

  return { mcInventory, mcTotalCount, isLoading, error };
};
