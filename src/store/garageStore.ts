import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GarageState {
  savedDealIds: string[];
  compareDeals: any[];
  toggleDeal: (id: string) => void;
  isSaved: (id: string) => boolean;
  addToCompare: (deal: any) => void;
  removeFromCompare: (id: string) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

export const useGarageStore = create<GarageState>()(
  persist(
    (set, get) => ({
      savedDealIds: [],
      compareDeals: [],
      toggleDeal: (id) => set((state) => ({
        savedDealIds: state.savedDealIds.includes(id)
          ? state.savedDealIds.filter((savedId) => savedId !== id)
          : [...state.savedDealIds, id]
      })),
      isSaved: (id) => get().savedDealIds.includes(id),
      addToCompare: (deal) => set((state) => {
        if (state.compareDeals.length >= 3) return state; // Limit to 3 for mobile/UI sanity
        if (state.compareDeals.some(d => d.id === deal.id)) return state;
        return { compareDeals: [...state.compareDeals, deal] };
      }),
      removeFromCompare: (id) => set((state) => ({
        compareDeals: state.compareDeals.filter(d => d.id !== id)
      })),
      clearCompare: () => set({ compareDeals: [] }),
      isInCompare: (id) => get().compareDeals.some(d => d.id === id),
    }),
    {
      name: 'garage-storage',
    }
  )
);
