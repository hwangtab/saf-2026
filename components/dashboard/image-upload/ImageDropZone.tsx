'use client';

import { useState } from 'react';
import type { ImageUploadCopy } from './types';

type ImageDropZoneProps = {
  uploading: boolean;
  uploadProgress: string | null;
  copy: ImageUploadCopy;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDrop: (files: File[]) => void;
};

export function ImageDropZone({
  uploading,
  uploadProgress,
  copy,
  fileInputRef,
  onDrop,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    onDrop(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  return (
    <button
      type="button"
      onClick={() => !uploading && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (uploading) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          fileInputRef.current?.click();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      aria-label={copy.addImage}
      disabled={uploading}
      className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center transition-colors ${
        uploading
          ? 'border-gray-200 bg-gray-50 cursor-wait'
          : isDragging
            ? 'border-primary bg-primary/5 cursor-pointer'
            : 'border-gray-300 hover:border-primary hover:bg-primary/5 cursor-pointer'
      }`}
    >
      {uploading ? (
        <div className="flex flex-col items-center px-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
          {uploadProgress && (
            <span className="text-[10px] text-gray-500 text-center leading-tight">
              {uploadProgress}
            </span>
          )}
        </div>
      ) : (
        <>
          <svg
            className="w-8 h-8 text-gray-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-xs text-gray-500">{copy.addImage}</span>
        </>
      )}
    </button>
  );
}
