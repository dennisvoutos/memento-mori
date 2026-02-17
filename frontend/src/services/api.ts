import type {
  ApiError,
  User,
  Memorial,
  LifeMoment,
  Memory,
  MemorialAccess,
  VisitorInteraction,
  MemorialStats,
  PrivacyLevel,
  MemoryType,
  InteractionType,
  AllowedReaction,
  Permission,
} from '@memento-mori/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiClientError extends Error {
  status: number;
  errors?: Array<{ field?: string; message: string }>;

  constructor(
    status: number,
    message: string,
    errors?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    const error = data as ApiError;
    throw new ApiClientError(res.status, error.message, error.errors);
  }

  return data as T;
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    // Don't set Content-Type — browser will set multipart/form-data with boundary
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json();

  if (!res.ok) {
    const error = data as ApiError;
    throw new ApiClientError(res.status, error.message, error.errors);
  }

  return data as T;
}

// ── Auth ──

export const auth = {
  register: (body: { displayName: string; email: string; password: string }) =>
    request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  logout: () =>
    request<{ message: string }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<{ user: User }>('/api/auth/me'),
};

// ── Memorials ──

export const memorials = {
  create: (body: {
    fullName: string;
    dateOfBirth?: string;
    dateOfPassing?: string;
    biography?: string | null;
    privacyLevel?: PrivacyLevel;
  }) =>
    request<Memorial>('/api/memorials', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  list: () => request<Memorial[]>('/api/memorials'),

  get: (id: string) => request<Memorial>(`/api/memorials/${id}`),

  getByToken: (token: string) =>
    request<Memorial>(`/api/memorials/shared/${token}`),

  update: (
    id: string,
    body: Partial<{
      fullName: string;
      dateOfBirth: string;
      dateOfPassing: string;
      biography: string | null;
      privacyLevel: PrivacyLevel;
    }>
  ) =>
    request<Memorial>(`/api/memorials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadFile<Memorial>(`/api/memorials/${id}/photo`, formData);
  },

  delete: (id: string) =>
    request<void>(`/api/memorials/${id}`, { method: 'DELETE' }),

  getShareLink: (id: string) =>
    request<{ accessToken: string }>(`/api/memorials/${id}/share-link`),

  // Access
  getAccess: (id: string) =>
    request<MemorialAccess[]>(`/api/memorials/${id}/access`),

  inviteUser: (id: string, body: { email: string; permission: Permission }) =>
    request<MemorialAccess>(`/api/memorials/${id}/access`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateAccess: (id: string, accessId: string, body: { permission: Permission }) =>
    request<MemorialAccess>(`/api/memorials/${id}/access/${accessId}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  revokeAccess: (id: string, accessId: string) =>
    request<void>(`/api/memorials/${id}/access/${accessId}`, {
      method: 'DELETE',
    }),
};

// ── Memories ──

export const memories = {
  create: (memorialId: string, body: { type: MemoryType; content: string }) =>
    request<Memory>(`/api/memorials/${memorialId}/memories`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  upload: (memorialId: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadFile<Memory>(
      `/api/memorials/${memorialId}/memories/upload`,
      formData
    );
  },

  list: (memorialId: string, page = 1, limit = 20) =>
    request<{
      items: Memory[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/memorials/${memorialId}/memories?page=${page}&limit=${limit}`),

  delete: (memorialId: string, memoryId: string) =>
    request<void>(`/api/memorials/${memorialId}/memories/${memoryId}`, {
      method: 'DELETE',
    }),
};

// ── Life Moments ──

export const lifeMoments = {
  create: (
    memorialId: string,
    body: { title: string; description?: string | null; date: string }
  ) =>
    request<LifeMoment>(
      `/api/memorials/${memorialId}/life-moments`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  list: (memorialId: string) =>
    request<LifeMoment[]>(
      `/api/memorials/${memorialId}/life-moments`
    ),

  update: (
    memorialId: string,
    momentId: string,
    body: Partial<{ title: string; description: string | null; date: string }>
  ) =>
    request<LifeMoment>(
      `/api/memorials/${memorialId}/life-moments/${momentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(body),
      }
    ),

  delete: (memorialId: string, momentId: string) =>
    request<void>(
      `/api/memorials/${memorialId}/life-moments/${momentId}`,
      { method: 'DELETE' }
    ),

  reorder: (memorialId: string, moments: Array<{ id: string; sortOrder: number }>) =>
    request<{ message: string }>(
      `/api/memorials/${memorialId}/life-moments-reorder`,
      {
        method: 'PUT',
        body: JSON.stringify({ moments }),
      }
    ),
};

// ── Interactions ──

export const interactions = {
  create: (
    memorialId: string,
    body: {
      type: InteractionType;
      content?: string | null;
      reactionEmoji?: AllowedReaction | null;
    }
  ) =>
    request<VisitorInteraction>(
      `/api/memorials/${memorialId}/interactions`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    ),

  list: (memorialId: string, page = 1, limit = 20) =>
    request<{
      items: VisitorInteraction[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(
      `/api/memorials/${memorialId}/interactions?page=${page}&limit=${limit}`
    ),

  stats: (memorialId: string) =>
    request<MemorialStats>(`/api/memorials/${memorialId}/stats`),
};

export { ApiClientError };

export const api = {
  auth,
  memorials: {
    ...memorials,
    generateShareLink: memorials.getShareLink,
  },
  memories,
  lifeMoments,
  interactions,
};
