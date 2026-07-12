import { create } from 'zustand';
import type { User } from '@memento-mori/shared';
import { ApiClientError, auth, clearAuthClientState } from '../services/api';

function deriveAuthState(user: User | null) {
  const hasPendingVerification = Boolean(user && !user.emailVerified);

  return {
    user,
    isAuthenticated: Boolean(user?.emailVerified),
    hasPendingVerification,
    pendingVerificationEmail: hasPendingVerification ? user?.email ?? null : null,
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasPendingVerification: boolean;
  pendingVerificationEmail: string | null;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  loginWithApple: (code: string) => Promise<void>;
  register: (
    displayName: string,
    email: string,
    password: string,
    acceptedTerms: boolean
  ) => Promise<User>;
  resendVerification: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  setPendingVerificationEmail: (email: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hasPendingVerification: false,
  pendingVerificationEmail: null,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await auth.login({ email, password });
      set({ ...deriveAuthState(user), isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({
        error: message,
        isLoading: false,
        pendingVerificationEmail:
          err instanceof ApiClientError && err.status === 403 ? email : null,
        hasPendingVerification: false,
      });
      throw err;
    }
  },

  loginWithGoogleCredential: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await auth.googleLogin({ credential });
      set({ ...deriveAuthState(user), isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  loginWithApple: async (code) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await auth.appleLogin({ code });
      set({ ...deriveAuthState(user), isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Apple sign-in failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (displayName, email, password, acceptedTerms) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await auth.register({
        displayName,
        email,
        password,
        acceptedTerms,
      });
      set({ ...deriveAuthState(user), isLoading: false, error: null });
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  resendVerification: async (email) => {
    set({ isLoading: true, error: null });
    try {
      const { message } = await auth.resendVerification({ email });
      set({
        isLoading: false,
        pendingVerificationEmail: email,
        error: null,
      });
      return message;
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to resend the verification email';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await auth.logout();
    } catch {
      // Ignore logout errors
    }
    clearAuthClientState();
    set({
      user: null,
      isAuthenticated: false,
      hasPendingVerification: false,
      pendingVerificationEmail: null,
      isLoading: false,
      error: null,
    });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { user } = await auth.me();
      set({ ...deriveAuthState(user), isLoading: false, error: null });
    } catch {
      clearAuthClientState();
      set({
        user: null,
        isAuthenticated: false,
        hasPendingVerification: false,
        pendingVerificationEmail: null,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user) => set({ ...deriveAuthState(user) }),

  setPendingVerificationEmail: (email) =>
    set({ pendingVerificationEmail: email }),
}));
