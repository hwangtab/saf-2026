'use client';

import { useState, useRef } from 'react';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { generateArtworkImageVariants, optimizeImage } from '@/lib/client/image-optimization';
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
};

const ARTWORK_VARIANT_SUFFIX_REGEX = /__(thumb|card|detail|hero|original)\.webp$/i;
const ARTWORK_VARIANTS = ['thumb', 'card', 'detail', 'hero', 'original'] as const;

const expandArtworkVariantPaths = (path: string): string[] => {
  const match = path.match(ARTWORK_VARIANT_SUFFIX_REGEX);
  if (!match) return [path];
  const prefix = path.replace(ARTWORK_VARIANT_SUFFIX_REGEX, '');
  return ARTWORK_VARIANTS.map((variant) => `${prefix}__${variant}.webp`);
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
    const cleanupCandidateUrls: string[] = [];
    const uploadedPaths: string[] = [];

    try {
      for (const file of files) {
        if (currentUrls.length + newUrls.length >= maxFiles) break;

        if (bucket === 'artworks') {
          const variants = await generateArtworkImageVariants(file);
          const baseName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
          let canonicalUrl: string | null = null;

          for (const variant of variants) {
            const filePath = `${pathPrefix}/${baseName}__${variant.variant}.webp`;
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(filePath, variant.file);

            if (uploadError) {
              throw uploadError;
            }

            uploadedPaths.push(filePath);

            const {
              data: { publicUrl },
            } = supabase.storage.from(bucket).getPublicUrl(filePath);
            cleanupCandidateUrls.push(publicUrl);

            if (variant.variant === 'original') {
              canonicalUrl = publicUrl;
            }
          }

          if (!canonicalUrl) {
            throw new Error('원본 이미지 URL 생성 실패');
          }
          newUrls.push(canonicalUrl);
          continue;
        }

        const optimizedFile = await optimizeImage(file);
        const fileExt = optimizedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${pathPrefix}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, optimizedFile);

        if (uploadError) {
          throw uploadError;
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
      const removalPaths = bucket === 'artworks' ? expandArtworkVariantPaths(path) : [path];
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
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`w-32 h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary hover:bg-primary/5'
            }`}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
        * 최대 {maxFiles}장, 업로드 시 자동 최적화 (WebP, 작품 이미지는 다중 해상도 생성)
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
