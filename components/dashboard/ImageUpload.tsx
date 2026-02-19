'use client';

import { useState, useRef } from 'react';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { optimizeArtworkImage, optimizeImage } from '@/lib/client/image-optimization';
import { useToast } from '@/lib/hooks/useToast';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import SafeImage from '@/components/common/SafeImage';

type UploadProps = {
  bucket: 'artworks' | 'profiles';
  pathPrefix: string; // e.g. user_id or artist_id
  onUploadComplete: (urls: string[]) => void;
  onUploadDelta?: (urls: string[]) => void;
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxFiles?: number;
  defaultImages?: string[];
  deleteOnRemove?: boolean;
};

const UPLOAD_MAX_RETRIES = 2;
const UPLOAD_RETRY_DELAY_BASE = 1000; // 1 second base delay for exponential backoff

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>(defaultImages);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    alt: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();
  const toast = useToast();
  const isControlled = Array.isArray(value);
  const currentUrls = isControlled ? (value as string[]) : previewUrls;
  const shouldDeleteOnRemove = deleteOnRemove ?? bucket !== 'artworks';

  // Upload with retry logic and exponential backoff
  const uploadWithRetry = async (
    filePath: string,
    file: Blob
  ): Promise<{ success: true } | { success: false; error: Error }> => {
    for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt++) {
      const { error } = await supabase.storage.from(bucket).upload(filePath, file);
      if (!error) return { success: true };
      if (attempt === UPLOAD_MAX_RETRIES) {
        return { success: false, error: new Error(error.message) };
      }
      // Exponential backoff: 1s, 2s
      await new Promise((r) => setTimeout(r, UPLOAD_RETRY_DELAY_BASE * (attempt + 1)));
    }
    return { success: false, error: new Error('최대 재시도 횟수 초과') };
  };

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
    setUploadProgress(null);
    const newUrls: string[] = [];
    const cleanupCandidateUrls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
        const file = files[fileIdx];
        if (currentUrls.length + newUrls.length >= maxFiles) break;

        if (bucket === 'artworks') {
          setUploadProgress(`이미지 ${fileIdx + 1}/${files.length}: 최적화 중...`);
          const optimizedFile = await optimizeArtworkImage(file);
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.webp`;
          const filePath = `${pathPrefix}/${fileName}`;

          setUploadProgress(`이미지 ${fileIdx + 1}/${files.length}: 업로드 중...`);
          const uploadResult = await uploadWithRetry(filePath, optimizedFile);
          if (!uploadResult.success) {
            throw uploadResult.error;
          }

          uploadedPaths.push(filePath);

          const {
            data: { publicUrl },
          } = supabase.storage.from(bucket).getPublicUrl(filePath);

          newUrls.push(publicUrl);
          cleanupCandidateUrls.push(publicUrl);
          continue;
        }

        setUploadProgress(`이미지 ${fileIdx + 1}/${files.length}: 최적화 중...`);
        const optimizedFile = await optimizeImage(file);
        const fileExt = optimizedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${pathPrefix}/${fileName}`;

        setUploadProgress(`이미지 ${fileIdx + 1}/${files.length}: 업로드 중...`);
        const uploadResult = await uploadWithRetry(filePath, optimizedFile);

        if (!uploadResult.success) {
          throw uploadResult.error;
        }

        uploadedPaths.push(filePath);

        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);

        newUrls.push(publicUrl);
        cleanupCandidateUrls.push(publicUrl);
      }

      const updatedUrls = [...currentUrls, ...newUrls];
      applyUrls(updatedUrls);
      if (cleanupCandidateUrls.length > 0) {
        onUploadDelta?.(cleanupCandidateUrls);
      }
    } catch (error: any) {
      if (uploadedPaths.length > 0) {
        await supabase.storage.from(bucket).remove(uploadedPaths);
      }
      toast.error('이미지 업로드 실패: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(null);
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
      const markers = [
        `/storage/v1/object/public/${bucket}/`,
        `/storage/v1/render/image/public/${bucket}/`,
      ];

      for (const marker of markers) {
        const index = url.pathname.indexOf(marker);
        if (index !== -1) {
          return url.pathname.slice(index + marker.length);
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  const removeImage = async (index: number) => {
    const urlToRemove = currentUrls[index];
    const path = getStoragePathFromPublicUrl(urlToRemove);

    if (shouldDeleteOnRemove && path) {
      const removalPaths = [path];
      const { error } = await supabase.storage.from(bucket).remove(removalPaths);
      if (error) {
        toast.error('이미지 삭제 실패: ' + error.message);
        return;
      }
    }

    const newUrls = currentUrls.filter((_, i) => i !== index);
    applyUrls(newUrls);
  };

  const handleImageClick = (index: number) => {
    setLightboxData({
      images: currentUrls,
      initialIndex: index,
      alt: `이미지 ${index + 1}`,
    });
    setLightboxOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {currentUrls.map((url, index) => {
          const previewSrc =
            bucket === 'artworks' ? resolveArtworkImageUrlForPreset(url, 'slider') : url;
          return (
            <div
              key={index}
              className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group"
            >
              <div
                className="absolute inset-0 cursor-zoom-in z-0"
                onClick={() => handleImageClick(index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleImageClick(index);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="이미지 확대하기"
              >
                <SafeImage
                  src={previewSrc}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
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
          );
        })}

        {currentUrls.length < maxFiles && (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
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

      <p className="text-xs text-gray-500">
        * 최대 {maxFiles}장, 업로드 시 자동 최적화 (WebP, 작품 이미지는 동적 리사이징)
      </p>

      {lightboxData && (
        <ArtworkLightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          images={lightboxData.images}
          initialIndex={lightboxData.initialIndex}
          alt={lightboxData.alt}
        />
      )}
    </div>
  );
}
