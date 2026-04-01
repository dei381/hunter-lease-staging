import { create } from 'zustand';

interface SiteSettings {
  brokerFee: number;
  taxRateDefault: number;
  supportEmail: string;
  maintenanceMode: boolean;
}

interface SettingsState {
  settings: SiteSettings;
  loading: boolean;
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {
    brokerFee: 595,
    taxRateDefault: 8.875,
    supportEmail: 'cargwin4555@gmail.com',
    maintenanceMode: false
  },
  loading: false,
  fetchSettings: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        set({ settings: data });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      set({ loading: false });
    }
  },
  updateSettings: async (newSettings: SiteSettings) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        },
        body: JSON.stringify(newSettings)
      });
      if (response.ok) {
        set({ settings: newSettings });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }
}));
