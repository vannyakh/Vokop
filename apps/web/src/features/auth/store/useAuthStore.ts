import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSessionResponse, AuthUser } from '@vokop/api';
import { isPersistedAuthUser } from '@/features/auth/lib/permissions';

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  setSession: (session: AuthSessionResponse) => void;
  setUser: (user: AuthUser) => void;
  logout: () => void;
}

const emptyState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoggedIn: false,
};

type PersistedAuth = Pick<AuthState, 'user' | 'accessToken' | 'refreshToken' | 'isLoggedIn'>;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...emptyState,
      setSession: (session) =>
        set({
          user: session.user,
          accessToken: session.tokens.accessToken,
          refreshToken: session.tokens.refreshToken,
          isLoggedIn: true,
        }),
      setUser: (user) => set({ user }),
      logout: () => set(emptyState),
    }),
    {
      name: 'vokop-auth',
      version: 3,
      migrate: (persisted): PersistedAuth => {
        const state = persisted as Partial<PersistedAuth> | undefined;
        if (!state?.isLoggedIn) {
          return { ...emptyState, ...state, user: state?.user ?? null };
        }

        const validUser = isPersistedAuthUser(state.user);
        const hasTokens = Boolean(state.accessToken && state.refreshToken);
        const isGuest = state.user?.kind === 'guest';

        if (!validUser || !hasTokens || isGuest) {
          return emptyState;
        }

        return {
          user: state.user ?? null,
          accessToken: state.accessToken ?? null,
          refreshToken: state.refreshToken ?? null,
          isLoggedIn: true,
        };
      },
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isLoggedIn: state.isLoggedIn,
      }),
    },
  ),
);

export function getAccessToken(): string | undefined {
  return useAuthStore.getState().accessToken ?? undefined;
}
