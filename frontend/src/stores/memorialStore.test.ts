import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMemorialStore } from './memorialStore';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    memorials: {
      list: vi.fn(),
      get: vi.fn(),
      getByToken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockApi = api.memorials as unknown as {
  list: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  getByToken: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const mockMemorial = {
  id: '1',
  fullName: 'John Doe',
  ownerId: 'user1',
  privacyLevel: 'PUBLIC',
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
  dateOfBirth: '1990-01-01',
  dateOfPassing: '2025-01-01',
  biography: 'A brief biography',
  profilePhotoUrl: 'https://example.com/photo.jpg',
};

describe('memorialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMemorialStore.setState({
      memorials: [],
      currentMemorial: null,
      isLoading: false,
      error: null,
    });
  });

  describe('fetchMyMemorials', () => {
    it('loads memorials on success', async () => {
      mockApi.list.mockResolvedValue([mockMemorial]);

      await useMemorialStore.getState().fetchMyMemorials();

      const state = useMemorialStore.getState();
      expect(state.memorials).toEqual([mockMemorial]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('sets error on failure', async () => {
      mockApi.list.mockRejectedValue(new Error('Network error'));

      await useMemorialStore.getState().fetchMyMemorials();

      expect(useMemorialStore.getState().error).toBe('Network error');
      expect(useMemorialStore.getState().isLoading).toBe(false);
    });
  });

  describe('fetchMemorial', () => {
    it('loads a single memorial', async () => {
      mockApi.get.mockResolvedValue(mockMemorial);

      await useMemorialStore.getState().fetchMemorial('1');

      expect(useMemorialStore.getState().currentMemorial).toEqual(mockMemorial);
      expect(useMemorialStore.getState().isLoading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await useMemorialStore.getState().fetchMemorial('999');

      expect(useMemorialStore.getState().error).toBe('Not found');
    });
  });

  describe('fetchMemorialByToken', () => {
    it('loads memorial by shared token', async () => {
      mockApi.getByToken.mockResolvedValue(mockMemorial);

      await useMemorialStore.getState().fetchMemorialByToken('abc123');

      expect(useMemorialStore.getState().currentMemorial).toEqual(mockMemorial);
    });

    it('sets error on failure', async () => {
      mockApi.getByToken.mockRejectedValue(new Error('Invalid token'));

      await useMemorialStore.getState().fetchMemorialByToken('bad');

      expect(useMemorialStore.getState().error).toBe('Invalid token');
    });
  });

  describe('createMemorial', () => {
    it('creates and adds memorial to list', async () => {
      const newMemorial = { ...mockMemorial, id: '2', fullName: 'Jane Doe' };
      mockApi.create.mockResolvedValue(newMemorial);

      const result = await useMemorialStore.getState().createMemorial({
        fullName: 'Jane Doe',
      });

      expect(result).toEqual(newMemorial);
      expect(useMemorialStore.getState().memorials).toContainEqual(newMemorial);
    });

    it('throws on failure', async () => {
      mockApi.create.mockRejectedValue(new Error('Validation error'));

      await expect(
        useMemorialStore.getState().createMemorial({ fullName: '' })
      ).rejects.toThrow();

      expect(useMemorialStore.getState().error).toBe('Validation error');
    });
  });

  describe('updateMemorial', () => {
    it('updates memorial in list and current', async () => {
      const updated = { ...mockMemorial, fullName: 'John Updated' };
      useMemorialStore.setState({
        memorials: [mockMemorial] as any,
        currentMemorial: mockMemorial as any,
      });
      mockApi.update.mockResolvedValue(updated);

      await useMemorialStore.getState().updateMemorial('1', { fullName: 'John Updated' } as any);

      const state = useMemorialStore.getState();
      expect(state.memorials[0].fullName).toBe('John Updated');
      expect(state.currentMemorial?.fullName).toBe('John Updated');
    });

    it('throws on failure', async () => {
      mockApi.update.mockRejectedValue(new Error('Failed'));

      await expect(
        useMemorialStore.getState().updateMemorial('1', {} as any)
      ).rejects.toThrow();
    });
  });

  describe('deleteMemorial', () => {
    it('removes memorial from list', async () => {
      useMemorialStore.setState({
        memorials: [mockMemorial] as any,
        currentMemorial: mockMemorial as any,
      });
      mockApi.delete.mockResolvedValue(undefined);

      await useMemorialStore.getState().deleteMemorial('1');

      const state = useMemorialStore.getState();
      expect(state.memorials).toHaveLength(0);
      expect(state.currentMemorial).toBeNull();
    });

    it('throws on failure', async () => {
      mockApi.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(
        useMemorialStore.getState().deleteMemorial('1')
      ).rejects.toThrow();

      expect(useMemorialStore.getState().error).toBe('Forbidden');
    });
  });

  describe('clearCurrent', () => {
    it('clears currentMemorial', () => {
      useMemorialStore.setState({ currentMemorial: mockMemorial as any });
      useMemorialStore.getState().clearCurrent();
      expect(useMemorialStore.getState().currentMemorial).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error', () => {
      useMemorialStore.setState({ error: 'Some error' });
      useMemorialStore.getState().clearError();
      expect(useMemorialStore.getState().error).toBeNull();
    });
  });
});
