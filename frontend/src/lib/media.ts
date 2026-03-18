const API_URL = import.meta.env.VITE_API_URL ?? '';

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:');
}

export function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (isAbsoluteUrl(url)) return url;

  const base = API_URL.replace(/\/$/, '') || window.location.origin;
  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${base}${normalizedPath}`;
}
