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

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

let csrfToken: string | null = null;
let csrfTokenRequest: Promise<string | null> | null = null;
let refreshSessionRequest: Promise<void> | null = null;

function clearCsrfState(): void {
  csrfToken = null;
  csrfTokenRequest = null;
}

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

const signedUrlCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = signedUrlCache.get(key);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAtMs) {
    signedUrlCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, expiresAt?: string | null): void {
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Date.now() + 5 * 60 * 1000;
  if (!Number.isFinite(expiresAtMs)) return;
  signedUrlCache.set(key, { value, expiresAtMs });
}

export function clearAuthClientState(): void {
  clearCsrfState();
  refreshSessionRequest = null;
}

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

async function parseApiResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get('content-type') ?? '';
  const isJsonResponse = contentType.includes('application/json');

  if (isJsonResponse) {
    const data = await res.json();

    if (!res.ok) {
      const error = data as ApiError;
      throw new ApiClientError(res.status, error.message, error.errors);
    }

    return data as T;
  }

  const text = await res.text();
  const message = res.ok
    ? 'Unexpected non-JSON response from server'
    : text.trim() || res.statusText || 'Request failed';

  throw new ApiClientError(res.status, message);
}

function isUnsafeMethod(method?: string): boolean {
  const normalizedMethod = method?.toUpperCase() ?? 'GET';
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(normalizedMethod);
}

async function requestCsrfToken(): Promise<string | null> {
  const res = await fetch(`${API_URL}/api/auth/csrf`, {
    credentials: 'include',
  });

  const data = await parseApiResponse<{ csrfToken: string }>(res);
  csrfToken = data.csrfToken ?? null;
  return csrfToken;
}

async function ensureCsrfToken(): Promise<string | null> {
  if (csrfToken) {
    return csrfToken;
  }

  if (!csrfTokenRequest) {
    csrfTokenRequest = requestCsrfToken().finally(() => {
      csrfTokenRequest = null;
    });
  }

  return csrfTokenRequest;
}

function shouldRefreshAfterUnauthorized(path: string): boolean {
  return ![
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/google/credential',
    '/api/auth/logout',
    '/api/auth/refresh',
    '/api/auth/csrf',
  ].includes(path);
}

async function performRefreshSession(
  retryOnCsrfFailure = true
): Promise<void> {
  const headers = new Headers();
  const nextCsrfToken = await ensureCsrfToken();

  if (nextCsrfToken) {
    headers.set('X-CSRF-Token', nextCsrfToken);
  }

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers,
  });

  try {
    await parseApiResponse<{ message: string }>(res);
  } catch (error) {
    if (
      retryOnCsrfFailure &&
      error instanceof ApiClientError &&
      error.status === 403 &&
      error.message === 'CSRF validation failed'
    ) {
      clearCsrfState();
      await ensureCsrfToken();
      return performRefreshSession(false);
    }

    clearAuthClientState();
    throw error;
  }
}

async function refreshSession(): Promise<void> {
  if (!refreshSessionRequest) {
    refreshSessionRequest = performRefreshSession().finally(() => {
      refreshSessionRequest = null;
    });
  }

  return refreshSessionRequest;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retryOnCsrfFailure = true,
  retryOnUnauthorized = true
): Promise<T> {
  const url = `${API_URL}${path}`;

  const method = options.method?.toUpperCase() ?? 'GET';
  const headers = new Headers(options.headers);
  if (options.body != null && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (isUnsafeMethod(method)) {
    const nextCsrfToken = await ensureCsrfToken();
    if (nextCsrfToken) {
      headers.set('X-CSRF-Token', nextCsrfToken);
    }
  }

  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers,
  });

  try {
    return await parseApiResponse<T>(res);
  } catch (error) {
    if (
      retryOnCsrfFailure &&
      error instanceof ApiClientError &&
      error.status === 403 &&
      error.message === 'CSRF validation failed' &&
      isUnsafeMethod(method)
    ) {
      clearCsrfState();
      await ensureCsrfToken();
      return request<T>(path, options, false, retryOnUnauthorized);
    }

    if (
      retryOnUnauthorized &&
      error instanceof ApiClientError &&
      error.status === 401 &&
      shouldRefreshAfterUnauthorized(path)
    ) {
      try {
        await refreshSession();
      } catch {
        throw error;
      }

      return request<T>(path, options, retryOnCsrfFailure, false);
    }

    throw error;
  }
}

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: formData,
  });
}

// ── Auth ──

export const auth = {
  register: (body: {
    displayName: string;
    email: string;
    password: string;
    acceptedTerms: boolean;
  }) =>
    request<{ user: User; message: string }>('/api/auth/register', {
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

  resendVerification: (body: { email: string }) =>
    request<{ message: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyEmail: (token: string) => {
    const searchParams = new URLSearchParams({ token });
    return request<{ message: string }>(
      `/api/auth/verify-email?${searchParams.toString()}`
    );
  },

  googleConfig: () => request<{ clientId: string }>('/api/auth/google/config'),

  googleLogin: (body: { credential: string }) =>
    request<{ user: User }>('/api/auth/google/credential', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  googleAuthUrl: (params: { entryPath: '/login' | '/register'; redirectTo: string }) => {
    const searchParams = new URLSearchParams({
      entryPath: params.entryPath,
      redirectTo: params.redirectTo,
    });

    return `${API_URL}/api/auth/google?${searchParams.toString()}`;
  },

  forgotPassword: (body: { email: string }) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  validateResetToken: (token: string) => {
    const searchParams = new URLSearchParams({ token });
    return request<{ valid: boolean }>(
      `/api/auth/reset-password/validate?${searchParams.toString()}`
    );
  },

  resetPassword: (body: {
    token: string;
    newPassword: string;
    confirmNewPassword: string;
  }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Profile ──

export const profile = {
  update: (body: { displayName: string; email: string }) =>
    request<{ user: User }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  changePassword: (body: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) =>
    request<{ message: string }>('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadFile<{ user: User; expiresAt?: string | null }>('/api/users/profile-picture', formData)
      .then((res) => {
        if (res.user?.id && res.user.profilePhotoUrl) {
          setCached(`user-profile:${res.user.id}`, {
            userId: res.user.id,
            url: res.user.profilePhotoUrl,
            thumbnailUrl: null,
            expiresAt: res.expiresAt ?? null,
          }, res.expiresAt ?? null);
        }
        return { user: res.user };
      });
  },

  deletePhoto: () =>
    request<{ user: User }>('/api/users/profile-picture', { method: 'DELETE' }),
};

interface MemorialImageItem {
  imageId: string;
  memorialId: string;
  caption: string | null;
  content: string | null;
  url: string | null;
  thumbnailUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  author?: { id: string; displayName: string };
}

interface MemorialImagesResponse {
  items: MemorialImageItem[];
}

export const memorialImages = {
  upload: async (memorialId: string, file: File, caption?: string, content?: string, accessToken?: string) => {
    const formData = new FormData();
    formData.append('image', file);
    if (caption) formData.append('caption', caption);
    if (content) formData.append('content', content);
    if (accessToken) formData.append('accessToken', accessToken);

    const image = await uploadFile<MemorialImageItem>(`/api/memorials/${memorialId}/images`, formData);
    signedUrlCache.delete(`memorial-images:${memorialId}`);

    return {
      id: image.imageId,
      memorialId: image.memorialId,
      authorId: image.author?.id ?? '',
      type: 'PHOTO' as const,
      content: image.content,
      mediaUrl: image.url,
      caption: image.caption,
      createdAt: image.createdAt,
      author: image.author,
    };
  },

  list: async (memorialId: string) => {
    const cacheKey = `memorial-images:${memorialId}`;
    const cached = getCached<MemorialImagesResponse>(cacheKey);
    if (cached) {
      return {
        items: cached.items.map((image) => ({
          id: image.imageId,
          memorialId: image.memorialId,
          authorId: image.author?.id ?? '',
          type: 'PHOTO' as const,
          content: image.content,
          mediaUrl: image.url,
          caption: image.caption,
          createdAt: image.createdAt,
          author: image.author,
        })),
      };
    }

    const response = await request<MemorialImagesResponse>(`/api/memorials/${memorialId}/images`);
    const earliestExpiry = response.items
      .map((item) => item.expiresAt)
      .filter((exp): exp is string => Boolean(exp))
      .map((exp) => Date.parse(exp))
      .filter((ms) => Number.isFinite(ms))
      .sort((a, b) => a - b)[0];

    setCached(cacheKey, response, earliestExpiry ? new Date(earliestExpiry).toISOString() : null);

    return {
      items: response.items.map((image) => ({
        id: image.imageId,
        memorialId: image.memorialId,
        authorId: image.author?.id ?? '',
        type: 'PHOTO' as const,
        content: image.content,
        mediaUrl: image.url,
        caption: image.caption,
        createdAt: image.createdAt,
        author: image.author,
      })),
    };
  },

  delete: async (memorialId: string, imageId: string) => {
    await request<void>(`/api/memorials/${memorialId}/images/${imageId}`, {
      method: 'DELETE',
    });
    signedUrlCache.delete(`memorial-images:${memorialId}`);
  },
};

// ── Memorials ──

export const memorials = {
  create: (body: {
    fullName: string;
    dateOfBirth?: string;
    dateOfPassing?: string;
    biography?: string | null;
    privacyLevel?: PrivacyLevel;
    allowPhotoUploads?: boolean;
  }) =>
    request<Memorial>('/api/memorials', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  list: () => request<Memorial[]>('/api/memorials'),

  get: (id: string) => request<Memorial>(`/api/memorials/${id}`),

  getByToken: (token: string) =>
    request<{ memorial: Memorial; permission: string }>(`/api/memorials/shared/${token}`)
      .then((res) => res.memorial),

  update: (
    id: string,
    body: Partial<{
      fullName: string;
      dateOfBirth: string;
      dateOfPassing: string;
      biography: string | null;
      privacyLevel: PrivacyLevel;
      allowPhotoUploads: boolean;
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

  upload: (memorialId: string, file: File, caption?: string, content?: string, accessToken?: string) =>
    memorialImages.upload(memorialId, file, caption, content, accessToken),

  list: async (memorialId: string, page = 1, limit = 20) => {
    const result = await memorialImages.list(memorialId);
    return {
      items: result.items,
      total: result.items.length,
      page,
      limit,
      totalPages: 1,
    };
  },

  delete: (memorialId: string, memoryId: string) =>
    memorialImages.delete(memorialId, memoryId),
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

// ── Contact ──

export const contact = {
  send: (body: { name: string; email: string; subject: string; message: string }) =>
    request<{ message: string }>('/api/contact', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

// ── Search ──

interface SearchResult {
  id: string;
  fullName: string;
  dateOfBirth: string;
  dateOfPassing: string;
  biography: string | null;
  profilePhotoUrl: string | null;
  createdAt: string;
}

export const search = {
  memorials: (q: string, page = 1, limit = 12) => {
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return request<{
      items: SearchResult[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/api/search?${params.toString()}`);
  },
};

export const api = {
  auth,
  profile,
  memorials: {
    ...memorials,
    generateShareLink: memorials.getShareLink,
  },
  memories,
  memorialImages,
  lifeMoments,
  interactions,
  contact,
  search,
};
