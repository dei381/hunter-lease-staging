import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LocationState {
  zipCode: string;
  hasConfirmedZip: boolean;
  setZipCode: (zip: string) => void;
  confirmZip: () => void;
  autoDetectZip: () => Promise<void>;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      zipCode: '90210', // default fallback
      hasConfirmedZip: false,
      setZipCode: (zip) => set({ zipCode: zip }),
      confirmZip: () => set({ hasConfirmedZip: true }),
      autoDetectZip: async () => {
        // If already confirmed, don't overwrite if auto-detecting again, just for safety
        if (get().hasConfirmedZip) return;
        
        try {
          // A simple public API for IP-based location (rate limited, but works for prototype)
          const response = await fetch('https://ipapi.co/json/');
          if (response.ok) {
            const data = await response.json();
            if (data.postal) {
              set({ zipCode: data.postal });
            }
          }
        } catch (error) {
          console.error('Failed to auto-detect ZIP:', error);
        }
      }
    }),
    {
      name: 'user-location-storage',
    }
  )
);
