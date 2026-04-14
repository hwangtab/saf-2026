'use client';

import ExportedImage from 'next-image-export-optimizer';
import type { ImageProps } from 'next/image';
import { useEffect, useState, useMemo, type ComponentProps } from 'react';
import {
  ARTWORK_TRANSFORM_PRESETS,
  resolveArtworkImageFallbackUrl,
  resolveOptimizedArtworkImageUrl,
} from '@/lib/utils';

type SafeImageProps = ComponentProps<typeof ExportedImage>;

const TRANSPARENT_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualzQAAAABJRU5ErkJggg==';
const ARTWORK_STORAGE_MARKERS = [
  '/storage/v1/object/public/artworks/',
  '/storage/v1/render/image/public/artworks/',
] as const;
const TRANSFORM_WIDTHS = [
  ARTWORK_TRANSFORM_PRESETS.slider.width,
  ARTWORK_TRANSFORM_PRESETS.card.width,
  ARTWORK_TRANSFORM_PRESETS.detail.width,
  ARTWORK_TRANSFORM_PRESETS.hero.width,
] as const;

function isArtworkStorageUrl(url: string): boolean {
  return ARTWORK_STORAGE_MARKERS.some((marker) => url.includes(marker));
}

function generateArtworkSrcSet(src: string): string | undefined {
  const candidates = TRANSFORM_WIDTHS.map((width) => {
    const quality = width <= 960 ? 75 : 80;
    const variantUrl = resolveOptimizedArtworkImageUrl(src, { width, quality });
    return { variantUrl, width };
  });

  const uniqueUrlCount = new Set(candidates.map((candidate) => candidate.variantUrl)).size;
  if (uniqueUrlCount <= 1) {
    return undefined;
  }

  return candidates.map((candidate) => `${candidate.variantUrl} ${candidate.width}w`).join(', ');
}

function RemoteSafeImage({ src, sizes, ...props }: { src: string } & Omit<ImageProps, 'src'>) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const { alt, onError, ...restProps } = props;

  const isArtwork = useMemo(() => isArtworkStorageUrl(src), [src]);
  const srcSet = useMemo(
    () => (isArtwork ? generateArtworkSrcSet(src) : undefined),
    [src, isArtwork]
  );

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const { fill, width, height, className, loading, priority, style } = restProps;

  const classObjectFit = (() => {
    if (typeof className !== 'string') return undefined;
    if (className.includes('object-contain')) return 'contain';
    if (className.includes('object-cover')) return 'cover';
    if (className.includes('object-fill')) return 'fill';
    if (className.includes('object-none')) return 'none';
    if (className.includes('object-scale-down')) return 'scale-down';
    return undefined;
  })();

  const resolvedObjectFit =
    (style as React.CSSProperties | undefined)?.objectFit || classObjectFit || 'cover';

  const defaultSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
  const effectiveSizes = sizes || defaultSizes;

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    onError?.(event);
    if (isArtwork) {
      const fallbackSrc = resolveArtworkImageFallbackUrl(currentSrc);
      if (fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
        return;
      }
    }
    // 최종 fallback: 1x1 투명 PNG (깨진 이미지 아이콘 방지)
    if (currentSrc !== TRANSPARENT_FALLBACK) {
      setCurrentSrc(TRANSPARENT_FALLBACK);
    }
  };

  if (fill) {
    return (
      <img
        src={currentSrc}
        srcSet={srcSet}
        sizes={srcSet ? effectiveSizes : undefined}
        alt={alt || ''}
        className={className}
        loading={priority ? 'eager' : (loading as 'lazy' | 'eager') || 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding={priority ? 'sync' : 'auto'}
        style={{
          position: 'absolute',
          height: '100%',
          width: '100%',
          maxWidth: 'none',
          inset: 0,
          objectFit: resolvedObjectFit,
          ...style,
        }}
        onError={handleError}
      />
    );
  }

  return (
    <img
      src={currentSrc}
      srcSet={srcSet}
      sizes={srcSet ? effectiveSizes : undefined}
      alt={alt || ''}
      width={typeof width === 'number' ? width : undefined}
      height={typeof height === 'number' ? height : undefined}
      className={className}
      loading={priority ? 'eager' : (loading as 'lazy' | 'eager') || 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding={priority ? 'sync' : 'async'}
      style={style as React.CSSProperties}
      onError={handleError}
    />
  );
}

export default function SafeImage({ src, ...props }: SafeImageProps) {
  const hasAltProp = Object.prototype.hasOwnProperty.call(props, 'alt');
  if (process.env.NODE_ENV !== 'production' && !hasAltProp) {
    console.warn('[SafeImage] Missing alt prop. Pass alt="" for decorative images.', { src });
  }

  const isRemote =
    typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));

  if (isRemote && typeof src === 'string') {
    const remoteProps = props as Omit<ImageProps, 'src'>;
    return <RemoteSafeImage src={src} {...remoteProps} />;
  }

  return <ExportedImage src={src} {...props} />;
}
