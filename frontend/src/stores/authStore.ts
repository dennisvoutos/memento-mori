import { create } from 'zustand';
import { auth, setStoredToken, clearStoredToken } from '../services/api';

interface User {
  id: string;
  email: string;
  displayName: string;
  profilePhotoUrl: string | null;
  hasPassword: boolean;
  isGoogleConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  loginWithGoogleCredential: (credential: string) => Promise<void>;
  register: (
    displayName: string,
    email: string,
    password: string,
    acceptedTerms: boolean
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await auth.login({ email, password });
      setStoredToken(token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  loginWithGoogleCredential: async (credential) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await auth.googleLogin({ credential });
      setStoredToken(token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (displayName, email, password, acceptedTerms) => {
    set({ isLoading: true, error: null });
    try {
      const { user, token } = await auth.register({
        displayName,
        email,
        password,
        acceptedTerms,
      });
      setStoredToken(token);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
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
    clearStoredToken();
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const { user } = await auth.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearStoredToken();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  setUser: (user) => set({ user }),
}));
