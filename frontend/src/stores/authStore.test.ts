import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';
import { auth } from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  auth: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  },
}));

const mockAuth = auth as {
  login: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  logout: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
};

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store to initial state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,
    });
  });

  describe('login', () => {
    it('sets user and isAuthenticated on success', async () => {
      const mockUser = { id: '1', email: 'test@test.com', displayName: 'Test' };
      mockAuth.login.mockResolvedValue({ user: mockUser });

      await useAuthStore.getState().login('test@test.com', 'password');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockAuth.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        useAuthStore.getState().login('bad@test.com', 'wrong')
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('register', () => {
    it('sets user on success', async () => {
      const mockUser = { id: '2', email: 'new@test.com', displayName: 'New User' };
      mockAuth.register.mockResolvedValue({ user: mockUser });

      await useAuthStore.getState().register('New User', 'new@test.com', 'pass123');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockAuth.register.mockRejectedValue(new Error('Email already taken'));

      await expect(
        useAuthStore.getState().register('User', 'dup@test.com', 'pass')
      ).rejects.toThrow();

      const state = useAuthStore.getState();
      expect(state.error).toBe('Email already taken');
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user and sets isAuthenticated to false', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', displayName: 'A', createdAt: '', updatedAt: '' },
        isAuthenticated: true,
        isLoading: false,
      });
      mockAuth.logout.mockResolvedValue({ message: 'ok' });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('still clears state even if API logout fails', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'a@b.com', displayName: 'A', createdAt: '', updatedAt: '' },
        isAuthenticated: true,
      });
      mockAuth.logout.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('sets user when session is valid', async () => {
      const mockUser = { id: '1', email: 'a@b.com', displayName: 'User' };
      mockAuth.me.mockResolvedValue({ user: mockUser });

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('clears user when session is invalid', async () => {
      mockAuth.me.mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().checkAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('clears the error', () => {
      useAuthStore.setState({ error: 'Some error' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
