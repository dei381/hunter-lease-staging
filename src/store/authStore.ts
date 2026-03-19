import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AuthState {
  user: User | null;
  role: 'customer' | 'admin' | null;
  isAuthReady: boolean;
  isAuthModalOpen: boolean;
  authEmail: string;
  setUser: (user: User | null) => void;
  setRole: (role: 'customer' | 'admin' | null) => void;
  setAuthReady: (ready: boolean) => void;
  setIsAuthModalOpen: (open: boolean) => void;
  setAuthEmail: (email: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  isAuthReady: false,
  isAuthModalOpen: false,
  authEmail: '',
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  setIsAuthModalOpen: (open) => set({ isAuthModalOpen: open }),
  setAuthEmail: (email) => set({ authEmail: email }),
}));
