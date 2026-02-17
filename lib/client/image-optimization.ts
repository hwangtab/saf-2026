import type { ArtworkImageVariant } from '@/lib/utils';

type VariantOutput = {
  variant: ArtworkImageVariant;
  file: File;
};

const ARTWORK_VARIANT_SPECS: Array<{
  variant: ArtworkImageVariant;
  maxSize: number;
  quality: number;
}> = [
  { variant: 'thumb', maxSize: 400, quality: 0.72 },
  { variant: 'card', maxSize: 960, quality: 0.75 },
  { variant: 'detail', maxSize: 1600, quality: 0.8 },
  { variant: 'hero', maxSize: 1920, quality: 0.8 },
  { variant: 'original', maxSize: 2560, quality: 0.82 },
];

const getResizedDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxSize: number
): { width: number; height: number } => {
  let width = originalWidth;
  let height = originalHeight;

  if (width > height) {
    if (width > maxSize) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    }
  } else if (height > maxSize) {
    width = Math.round((width * maxSize) / height);
    height = maxSize;
  }

  return { width, height };
};

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러올 수 없습니다.'));
    };
    img.src = url;
  });

/**
 * Renders an image to WebP format with specified dimensions.
 */
const renderToWebpFile = (
  img: HTMLImageElement,
  outputName: string,
  maxSize: number,
  quality: number
): Promise<File> =>
  new Promise((resolve, reject) => {
    const { width, height } = getResizedDimensions(img.width, img.height, maxSize);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('캔버스 컨텍스트 생성 실패'));
      return;
    }

    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('이미지 변환 실패'));
          return;
        }

        resolve(
          new File([blob], outputName, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
        );
      },
      'image/webp',
      quality
    );
  });

/**
 * Optimizes a single image file for non-artwork usage (profiles, etc).
 * Resizes to max 2560px and converts to WebP.
 */
export async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  try {
    const img = await loadImage(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    return await renderToWebpFile(img, `${baseName}.webp`, 2560, 0.8);
  } catch {
    return file;
  }
}

/**
 * Generates multiple WebP variants for artwork delivery.
 * Processes sequentially to avoid memory issues with large images.
 */
export async function generateArtworkImageVariants(file: File): Promise<VariantOutput[]> {
  if (!file.type.startsWith('image/')) {
    return [{ variant: 'original', file }];
  }

  try {
    const img = await loadImage(file);
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const outputs: VariantOutput[] = [];

    // Process variants sequentially (not in parallel) to avoid memory issues
    for (const { variant, maxSize, quality } of ARTWORK_VARIANT_SPECS) {
      const optimized = await renderToWebpFile(
        img,
        `${baseName}__${variant}.webp`,
        maxSize,
        quality
      );
      outputs.push({ variant, file: optimized });
    }

    return outputs;
  } catch {
    const fallback = await optimizeImage(file);
    return [{ variant: 'original', file: fallback }];
  }
}
