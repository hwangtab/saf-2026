'use client';

import { useState, useRef } from 'react';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { optimizeImage } from '@/lib/client/image-optimization';
// Assuming Icons are imported as Lucide/Heroicons or from the Icons component
// Using a simple fallback svg if Icons not easily importable in one line, but user has Icons.tsx
// Let's assume standard Lucide names or similar from Icons.tsx if available, or just SVGs for now for portability.

type UploadProps = {
  bucket: 'artworks' | 'profiles';
  pathPrefix: string; // e.g. user_id or artist_id
  onUploadComplete: (urls: string[]) => void;
  onUploadDelta?: (urls: string[]) => void;
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxFiles?: number;
  defaultImages?: string[];
};

export function ImageUpload({
  bucket,
  pathPrefix,
  onUploadComplete,
  onUploadDelta,
  value,
  onChange,
  maxFiles = 1,
  defaultImages = [],
}: UploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>(defaultImages);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{ src: string; alt: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();
  const isControlled = Array.isArray(value);
  const currentUrls = isControlled ? (value as string[]) : previewUrls;

  const applyUrls = (nextUrls: string[]) => {
    if (!isControlled) {
      setPreviewUrls(nextUrls);
    }
    onUploadComplete(nextUrls);
    onChange?.(nextUrls);
  };

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of files) {
        if (currentUrls.length + newUrls.length >= maxFiles) break;

        // 1. Optimize
        const optimizedFile = await optimizeImage(file);

        // 2. Upload
        const fileExt = optimizedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${pathPrefix}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, optimizedFile);

        if (uploadError) {
          throw uploadError;
        }

        // 3. Get Public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const updatedUrls = [...currentUrls, ...newUrls];
      applyUrls(updatedUrls);
      if (newUrls.length > 0) {
        onUploadDelta?.(newUrls);
      }
    } catch (error: any) {
      alert('이미지 업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    await handleFiles(files);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    await handleFiles(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const getStoragePathFromPublicUrl = (publicUrl: string) => {
    try {
      const url = new URL(publicUrl);
      const marker = `/storage/v1/object/public/${bucket}/`;
      const index = url.pathname.indexOf(marker);
      if (index === -1) return null;
      return url.pathname.slice(index + marker.length);
    } catch {
      return null;
    }
  };

  const removeImage = async (index: number) => {
    const urlToRemove = currentUrls[index];
    const path = getStoragePathFromPublicUrl(urlToRemove);

    if (path) {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        alert('이미지 삭제 실패: ' + error.message);
        return;
      }
    }

    const newUrls = currentUrls.filter((_, i) => i !== index);
    applyUrls(newUrls);
  };

  const handleImageClick = (src: string, alt: string) => {
    setLightboxData({ src, alt });
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {currentUrls.map((url, index) => (
          <div
            key={index}
            className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group"
          >
            <div
              className="cursor-zoom-in h-full w-full"
              onClick={() => handleImageClick(url, `Preview ${index + 1}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleImageClick(url, `Preview ${index + 1}`);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label="이미지 확대하기"
            >
              <img src={url} alt="Preview" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => removeImage(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ))}

        {currentUrls.length < maxFiles && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            ) : (
              <>
                <svg
                  className="w-8 h-8 text-gray-400 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-xs text-gray-500">이미지 추가</span>
              </>
            )}
          </div>
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

      <p className="text-xs text-gray-500">* 최대 {maxFiles}장, 장당 2560px 자동 최적화 (WebP)</p>

      {lightboxData && (
        <ArtworkLightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          src={lightboxData.src}
          alt={lightboxData.alt}
        />
      )}
    </div>
  );
}
