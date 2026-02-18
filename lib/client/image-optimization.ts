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

export async function optimizeArtworkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  const img = await loadImage(file);
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  return await renderToWebpFile(img, `${baseName}.webp`, 2560, 0.82);
}
