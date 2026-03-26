import { create } from 'zustand';

interface SiteSettings {
  platformFee: number;
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
    platformFee: 95,
    taxRateDefault: 8.875,
    supportEmail: 'cargwin4555@gmail.com',
    maintenanceMode: false
  },
  loading: false,
  fetchSettings: async () => {
    set({ loading: true });
    try {
      console.log('Fetching settings from /api/settings...');
      const response = await fetch('/api/settings');
      console.log('Settings response:', response.status, response.statusText);
      if (response.ok) {
        const data = await response.json();
        set({ settings: data });
      } else {
        console.error('Settings response not ok:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message, error.stack);
      }
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
