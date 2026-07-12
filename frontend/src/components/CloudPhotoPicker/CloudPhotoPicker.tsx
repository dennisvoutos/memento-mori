import { useState, useCallback } from 'react';
import { GooglePhotosPicker } from './GooglePhotosPicker';
import { ICloudPhotosPicker } from './ICloudPhotosPicker';
import { Button } from '../ui/Button';
import {
  CloudOutlined,
  GoogleOutlined,
  PictureOutlined,
  LaptopOutlined,
} from '@ant-design/icons';
import type { CloudPhotoSource } from './types';
import './CloudPhotoPicker.css';

export interface SelectedPhoto {
  file: File;
  source: CloudPhotoSource;
  previewUrl: string;
}

interface CloudPhotoPickerProps {
  memorialId?: string;
  maxPhotos?: number;
  maxPhotoSizeMB?: number;
  selectedCount: number;
  onPhotosSelected: (photos: SelectedPhoto[]) => void;
  onClose?: () => void;
}

type PickerTab = 'local' | 'google-photos' | 'icloud';

export type { CloudPhotoSource } from './types';

export function CloudPhotoPicker({
  memorialId,
  maxPhotos = 50,
  maxPhotoSizeMB = 5,
  selectedCount,
  onPhotosSelected,
  onClose,
}: CloudPhotoPickerProps) {
  const [activeTab, setActiveTab] = useState<PickerTab>('local');
  const [pendingPhotos, setPendingPhotos] = useState<SelectedPhoto[]>([]);
  const [localPreviews, setLocalPreviews] = useState<SelectedPhoto[]>([]);

  const remainingSlots = Math.max(0, maxPhotos - selectedCount);
  const maxBytes = maxPhotoSizeMB * 1024 * 1024;

  const handleLocalFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const newPhotos: SelectedPhoto[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          errors.push(`${file.name}: Unsupported format. Use JPEG, PNG, or WebP.`);
          continue;
        }

        if (file.size > maxBytes) {
          errors.push(`${file.name}: Exceeds ${maxPhotoSizeMB}MB limit.`);
          continue;
        }

        if (newPhotos.length >= remainingSlots) {
          errors.push(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added.`);
          break;
        }

        newPhotos.push({
          file,
          source: 'local',
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (errors.length > 0) {
        // Surface errors — in a real implementation, use notifications
        console.warn('Photo selection errors:', errors);
      }

      if (newPhotos.length > 0) {
        setLocalPreviews((prev) => [...prev, ...newPhotos]);
        onPhotosSelected(newPhotos);
      }
    },
    [maxBytes, remainingSlots, onPhotosSelected]
  );

  const handleCloudPhotosSelected = useCallback(
    (photos: SelectedPhoto[]) => {
      onPhotosSelected(photos);
    },
    [onPhotosSelected]
  );

  const tabs: { key: PickerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'local', label: 'My Computer', icon: <LaptopOutlined /> },
    { key: 'google-photos', label: 'Google Photos', icon: <GoogleOutlined /> },
    { key: 'icloud', label: 'iCloud Photos', icon: <CloudOutlined /> },
  ];

  return (
    <div className="cloud-photo-picker">
      <div className="cloud-photo-picker-header">
        <h3 className="cloud-photo-picker-title">
          <PictureOutlined /> Add Photos
        </h3>
        <span className="cloud-photo-picker-count">
          {selectedCount} / {maxPhotos} selected
        </span>
        {onClose && (
          <button
            type="button"
            className="cloud-photo-picker-close"
            onClick={onClose}
            aria-label="Close photo picker"
          >
            ✕
          </button>
        )}
      </div>

      <div className="cloud-photo-picker-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`cloud-photo-picker-tab ${activeTab === tab.key ? 'cloud-photo-picker-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            <span className="cloud-photo-picker-tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="cloud-photo-picker-body" role="tabpanel">
        {activeTab === 'local' && (
          <div className="cloud-photo-picker-local">
            <label className="cloud-photo-picker-dropzone">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => handleLocalFiles(e.target.files)}
                className="cloud-photo-picker-input"
              />
              <div className="cloud-photo-picker-dropzone-content">
                <PictureOutlined className="cloud-photo-picker-dropzone-icon" />
                <p className="cloud-photo-picker-dropzone-text">
                  Click to browse or drag and drop
                </p>
                <p className="cloud-photo-picker-dropzone-hint">
                  JPEG, PNG, or WebP. Up to {maxPhotoSizeMB}MB each. {remainingSlots} remaining.
                </p>
              </div>
            </label>

            {localPreviews.length > 0 && (
              <div className="cloud-photo-picker-previews">
                {localPreviews.map((photo, index) => (
                  <div key={index} className="cloud-photo-picker-thumb">
                    <img
                      src={photo.previewUrl}
                      alt={`Selected photo ${index + 1}`}
                      className="cloud-photo-picker-thumb-img"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'google-photos' && (
          <GooglePhotosPicker
            memorialId={memorialId}
            maxPhotos={remainingSlots}
            maxPhotoSizeMB={maxPhotoSizeMB}
            onPhotosSelected={handleCloudPhotosSelected}
          />
        )}

        {activeTab === 'icloud' && (
          <ICloudPhotosPicker />
        )}
      </div>
    </div>
  );
}
