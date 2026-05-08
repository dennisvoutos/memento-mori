import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';

const R2_BUCKET = process.env.R2_BUCKET || '';
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (process.env.R2_ACCOUNT_ID
    ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
    : '');
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const SIGNED_URL_TTL_SECONDS = Math.max(
  60,
  Number(process.env.R2_SIGNED_URL_TTL_SECONDS || 3600)
);

function assertR2Configuration() {
  if (!R2_BUCKET || !R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'R2 storage is not fully configured. Set R2_BUCKET, R2_ENDPOINT (or R2_ACCOUNT_ID), R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.'
    );
  }
}

assertR2Configuration();

const r2Client = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface SignedImageResult {
  url: string;
  expiresAt: string;
}

export interface ProcessedImageBuffers {
  originalJpeg: Buffer;
  thumbnailJpeg: Buffer;
}

export function profileObjectKey(userId: string): string {
  return `users/${userId}/profile.jpg`;
}

export function profileThumbObjectKey(userId: string): string {
  return `users/${userId}/profile_thumb.jpg`;
}

export function memorialObjectKey(memorialId: string, imageId: string): string {
  return `memorials/${memorialId}/${imageId}.jpg`;
}

export function memorialThumbObjectKey(memorialId: string, imageId: string): string {
  return `memorials/${memorialId}/${imageId}_thumb.jpg`;
}

export function isR2ObjectKey(value?: string | null): value is string {
  if (!value) return false;
  return value.startsWith('users/') || value.startsWith('memorials/');
}

export function getThumbKeyForObjectKey(key: string): string | null {
  if (key.endsWith('/profile.jpg')) {
    return key.replace('/profile.jpg', '/profile_thumb.jpg');
  }
  if (key.endsWith('.jpg')) {
    return key.replace(/\.jpg$/, '_thumb.jpg');
  }
  return null;
}

export async function processImageBuffers(inputBuffer: Buffer): Promise<ProcessedImageBuffers> {
  const originalJpeg = await sharp(inputBuffer)
    .rotate()
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const thumbnailJpeg = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 320, height: 320, fit: 'cover' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();

  return { originalJpeg, thumbnailJpeg };
}

export async function putJpegObject(
  key: string,
  body: Buffer,
  cacheControl = 'public, max-age=3600'
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
      CacheControl: cacheControl,
    })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    })
  );
}

export async function deleteObjectIfExists(key?: string | null): Promise<void> {
  if (!key) return;
  await deleteObject(key);
}

export async function getSignedImageUrl(
  key: string,
  expiresIn = SIGNED_URL_TTL_SECONDS
): Promise<SignedImageResult> {
  const url = await getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
    { expiresIn }
  );

  return {
    url,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}
