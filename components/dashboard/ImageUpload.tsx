'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { IMAGE_UPLOAD_COPY } from './image-upload/types';
import { useImageUpload } from './image-upload/useImageUpload';
import { ImageDropZone } from './image-upload/ImageDropZone';
import { ImagePreview } from './image-upload/ImagePreview';
import type { UploadProps } from './image-upload/types';

export type { UploadProps };

export function ImageUpload({
  bucket,
  pathPrefix,
  onUploadComplete,
  onUploadDelta,
  value,
  onChange,
  maxFiles = 1,
  defaultImages = [],
  deleteOnRemove,
}: UploadProps) {
  const locale = useLocale();
  const copy = IMAGE_UPLOAD_COPY[locale as 'ko' | 'en'];
  const [previewUrls, setPreviewUrls] = useState<string[]>(defaultImages);
  const isControlled = Array.isArray(value);
  const currentUrls = isControlled ? (value as string[]) : previewUrls;

  const applyUrls = useCallback(
    (nextUrls: string[]) => {
      if (!isControlled) {
        setPreviewUrls(nextUrls);
      }
      onUploadComplete(nextUrls);
      onChange?.(nextUrls);
    },
    [isControlled, onUploadComplete, onChange]
  );

  const { uploading, uploadProgress, fileInputRef, handleFiles, handleFileSelect, removeImage } =
    useImageUpload({
      bucket,
      pathPrefix,
      maxFiles,
      currentUrls,
      copy,
      applyUrls,
      onUploadDelta,
      deleteOnRemove,
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <ImagePreview bucket={bucket} urls={currentUrls} copy={copy} onRemove={removeImage} />

        {currentUrls.length < maxFiles && (
          <ImageDropZone
            uploading={uploading}
            uploadProgress={uploadProgress}
            copy={copy}
            fileInputRef={fileInputRef}
            onDrop={handleFiles}
          />
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
        multiple={maxFiles > 1}
      />

      <p className="text-xs text-gray-500">{copy.footer(maxFiles)}</p>
    </div>
  );
}
