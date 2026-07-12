export type CloudPhotoSource = 'local' | 'google-photos' | 'icloud';

export interface GooglePhotoItem {
  id: string;
  baseUrl: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  createdAt: string;
}
