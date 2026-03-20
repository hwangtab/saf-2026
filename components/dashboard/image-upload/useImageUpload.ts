'use client';

import { useState, useRef, useCallback } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { optimizeArtworkImage, optimizeImage } from '@/lib/client/image-optimization';
import { useToast } from '@/lib/hooks/useToast';
import type { UploadBucket, ImageUploadCopy } from './types';

const UPLOAD_MAX_RETRIES = 2;
const UPLOAD_RETRY_DELAY_BASE = 1000; // 1 second base delay for exponential backoff

type UseImageUploadOptions = {
  bucket: UploadBucket;
  pathPrefix: string;
  maxFiles: number;
  currentUrls: string[];
  copy: ImageUploadCopy;
  applyUrls: (urls: string[]) => void;
  onUploadDelta?: (urls: string[]) => void;
  deleteOnRemove?: boolean;
};

export function useImageUpload({
  bucket,
  pathPrefix,
  maxFiles,
  currentUrls,
  copy,
  applyUrls,
  onUploadDelta,
  deleteOnRemove,
}: UseImageUploadOptions) {
  const shouldDeleteOnRemove = deleteOnRemove ?? bucket !== 'artworks';
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowserClient();
  const toast = useToast();

  const uploadWithRetry = useCallback(
    async (
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
      return { success: false, error: new Error(copy.maxRetriesExceeded) };
    },
    [bucket, copy.maxRetriesExceeded, supabase.storage]
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
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
            setUploadProgress(copy.optimizing(fileIdx + 1, files.length));
            const optimizedFile = await optimizeArtworkImage(file);
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.webp`;
            const filePath = `${pathPrefix}/${fileName}`;

            setUploadProgress(copy.uploading(fileIdx + 1, files.length));
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

          setUploadProgress(copy.optimizing(fileIdx + 1, files.length));
          const optimizedFile = await optimizeImage(file);
          const fileExt = optimizedFile.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
          const filePath = `${pathPrefix}/${fileName}`;

          setUploadProgress(copy.uploading(fileIdx + 1, files.length));
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
      } catch (error) {
        console.error('[ImageUpload] File upload flow failed:', error);
        if (uploadedPaths.length > 0) {
          await supabase.storage.from(bucket).remove(uploadedPaths);
        }
        toast.error(copy.uploadFailed);
      } finally {
        setUploading(false);
        setUploadProgress(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [
      bucket,
      pathPrefix,
      maxFiles,
      currentUrls,
      copy,
      applyUrls,
      onUploadDelta,
      supabase.storage,
      toast,
      uploadWithRetry,
    ]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const files = Array.from(e.target.files);
      await handleFiles(files);
    },
    [handleFiles]
  );

  const getStoragePathFromPublicUrl = useCallback(
    (publicUrl: string) => {
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
      } catch (error) {
        console.error('[ImageUpload] Public URL parsing failed:', error);
        return null;
      }
    },
    [bucket]
  );

  const removeImage = useCallback(
    async (index: number) => {
      const urlToRemove = currentUrls[index];
      const path = getStoragePathFromPublicUrl(urlToRemove);

      if (shouldDeleteOnRemove && path) {
        const removalPaths = [path];
        const { error } = await supabase.storage.from(bucket).remove(removalPaths);
        if (error) {
          toast.error(copy.removeFailed);
          return;
        }
      }

      const newUrls = currentUrls.filter((_, i) => i !== index);
      applyUrls(newUrls);
    },
    [
      shouldDeleteOnRemove,
      bucket,
      currentUrls,
      getStoragePathFromPublicUrl,
      supabase.storage,
      toast,
      copy,
      applyUrls,
    ]
  );

  return {
    uploading,
    uploadProgress,
    fileInputRef,
    handleFiles,
    handleFileSelect,
    removeImage,
  };
}
