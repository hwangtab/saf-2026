export type UploadBucket = 'artworks' | 'profiles';

export type UploadProps = {
  bucket: UploadBucket;
  pathPrefix: string; // e.g. user_id or artist_id
  onUploadComplete: (urls: string[]) => void;
  onUploadDelta?: (urls: string[]) => void;
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxFiles?: number;
  defaultImages?: string[];
  deleteOnRemove?: boolean;
};

export type ImageUploadCopy = {
  maxRetriesExceeded: string;
  optimizing: (index: number, total: number) => string;
  uploading: (index: number, total: number) => string;
  uploadFailed: string;
  removeFailed: string;
  zoomImage: string;
  imageAlt: (index: number) => string;
  addImage: string;
  footer: (maxFiles: number) => string;
  previewAlt: string;
};

export const IMAGE_UPLOAD_COPY: Record<'ko' | 'en', ImageUploadCopy> = {
  ko: {
    maxRetriesExceeded: '최대 재시도 횟수 초과',
    optimizing: (index: number, total: number) => `이미지 ${index}/${total}: 최적화 중...`,
    uploading: (index: number, total: number) => `이미지 ${index}/${total}: 업로드 중...`,
    uploadFailed: '이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.',
    removeFailed: '이미지 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.',
    zoomImage: '이미지 확대하기',
    imageAlt: (index: number) => `이미지 ${index}`,
    addImage: '이미지 추가',
    footer: (maxFiles: number) =>
      `* 최대 ${maxFiles}장, 업로드 시 자동 최적화 (WebP, 작품 이미지는 동적 리사이징)`,
    previewAlt: '미리보기',
  },
  en: {
    maxRetriesExceeded: 'Exceeded maximum retry attempts',
    optimizing: (index: number, total: number) => `Image ${index}/${total}: optimizing...`,
    uploading: (index: number, total: number) => `Image ${index}/${total}: uploading...`,
    uploadFailed: 'Failed to upload image. Please try again shortly.',
    removeFailed: 'Failed to remove image. Please try again shortly.',
    zoomImage: 'Zoom image',
    imageAlt: (index: number) => `Image ${index}`,
    addImage: 'Add image',
    footer: (maxFiles: number) =>
      `* Up to ${maxFiles} files, auto-optimized on upload (WebP, dynamic resizing for artwork images)`,
    previewAlt: 'Preview',
  },
};
