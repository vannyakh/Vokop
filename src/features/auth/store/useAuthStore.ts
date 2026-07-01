import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  name: string;
  email: string;
}

interface AuthState {
  isLoggedIn: boolean;
  user: User | null;
  login: (user?: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      user: null,
      login: (user) =>
        set({
          isLoggedIn: true,
          user: user ?? { name: 'Guest User', email: 'guest@vokop.app' },
        }),
      logout: () => set({ isLoggedIn: false, user: null }),
    }),
    { name: 'vokop-auth' },
  ),
);
