import { create } from 'zustand';
import type { Memorial } from '@memento-mori/shared';
import { api } from '../services/api';

interface MemorialState {
  memorials: Memorial[];
  currentMemorial: Memorial | null;
  isLoading: boolean;
  error: string | null;

  fetchMyMemorials: () => Promise<void>;
  fetchMemorial: (id: string) => Promise<void>;
  fetchMemorialByToken: (token: string) => Promise<void>;
  createMemorial: (data: {
    fullName: string;
    dateOfBirth?: string;
    dateOfPassing?: string;
    biography?: string;
    privacyLevel?: string;
  }) => Promise<Memorial>;
  updateMemorial: (id: string, data: Partial<Memorial>) => Promise<void>;
  deleteMemorial: (id: string) => Promise<void>;
  clearCurrent: () => void;
  clearError: () => void;
}

export const useMemorialStore = create<MemorialState>((set) => ({
  memorials: [],
  currentMemorial: null,
  isLoading: false,
  error: null,

  fetchMyMemorials: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.memorials.list();
      set({ memorials: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load memorials',
        isLoading: false,
      });
    }
  },

  fetchMemorial: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.memorials.get(id);
      set({ currentMemorial: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load memorial',
        isLoading: false,
      });
    }
  },

  fetchMemorialByToken: async (token: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.memorials.getByToken(token);
      set({ currentMemorial: data, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Memorial not found',
        isLoading: false,
      });
    }
  },

  createMemorial: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const memorial = await api.memorials.create(data as any);
      set((s) => ({
        memorials: [memorial, ...s.memorials],
        isLoading: false,
      }));
      return memorial;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create memorial',
        isLoading: false,
      });
      throw err;
    }
  },

  updateMemorial: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await api.memorials.update(id, data as any);
      set((s) => ({
        memorials: s.memorials.map((m) => (m.id === id ? updated : m)),
        currentMemorial: s.currentMemorial?.id === id ? updated : s.currentMemorial,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update memorial',
        isLoading: false,
      });
      throw err;
    }
  },

  deleteMemorial: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.memorials.delete(id);
      set((s) => ({
        memorials: s.memorials.filter((m) => m.id !== id),
        currentMemorial: s.currentMemorial?.id === id ? null : s.currentMemorial,
        isLoading: false,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete memorial',
        isLoading: false,
      });
      throw err;
    }
  },

  clearCurrent: () => set({ currentMemorial: null }),
  clearError: () => set({ error: null }),
}));
