'use client';

import ExportedImage from 'next-image-export-optimizer';
import Image from 'next/image';
import { useEffect, useState, useMemo, type ComponentProps } from 'react';
import {
  resolveArtworkImageFallbackUrl,
  resolveArtworkVariantUrl,
  ARTWORK_IMAGE_VARIANTS,
} from '@/lib/utils';

type SafeImageProps = ComponentProps<typeof ExportedImage>;

const ARTWORK_STORAGE_MARKERS = [
  '/storage/v1/object/public/artworks/',
  '/storage/v1/render/image/public/artworks/',
] as const;
const ARTWORK_VARIANT_SUFFIX_REGEX =
  /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;

const VARIANT_WIDTHS: Record<string, number> = {
  thumb: 400,
  card: 960,
  detail: 1600,
  hero: 1920,
  original: 2560,
};

function isArtworkStorageUrl(url: string): boolean {
  return ARTWORK_STORAGE_MARKERS.some((marker) => url.includes(marker));
}

function hasVariantSuffix(url: string): boolean {
  return ARTWORK_VARIANT_SUFFIX_REGEX.test(url);
}

function generateArtworkSrcSet(src: string): string {
  return ARTWORK_IMAGE_VARIANTS.map((variant) => {
    const variantUrl = resolveArtworkVariantUrl(src, variant);
    const width = VARIANT_WIDTHS[variant];
    return `${variantUrl} ${width}w`;
  }).join(', ');
}

function RemoteSafeImage({
  src,
  sizes,
  ...props
}: { src: string } & Omit<ComponentProps<typeof Image>, 'src'>) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const { alt, onError, ...restProps } = props;

  const isArtwork = useMemo(() => isArtworkStorageUrl(src), [src]);
  const hasVariants = useMemo(() => hasVariantSuffix(src), [src]);
  const srcSet = useMemo(
    () => (isArtwork && hasVariants ? generateArtworkSrcSet(src) : undefined),
    [src, isArtwork, hasVariants]
  );

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  // For artwork images, use native img to avoid hydration issues
  // srcSet is only available for images with pre-generated variants
  if (isArtwork) {
    // Extract only the props we need, ignore Next.js Image specific props
    const { fill, width, height, className, loading, priority, style } = restProps;

    // Determine default sizes if not provided
    const defaultSizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';
    const effectiveSizes = sizes || defaultSizes;

    const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
      onError?.(event);
      const fallbackSrc = resolveArtworkImageFallbackUrl(currentSrc);
      if (fallbackSrc !== currentSrc) {
        setCurrentSrc(fallbackSrc);
      }
    };

    // Handle fill mode
    if (fill) {
      return (
        <img
          src={currentSrc}
          srcSet={srcSet}
          sizes={srcSet ? effectiveSizes : undefined}
          alt={alt || ''}
          className={className}
          loading={priority ? 'eager' : (loading as 'lazy' | 'eager') || 'lazy'}
          decoding="async"
          style={{
            position: 'absolute',
            height: '100%',
            width: '100%',
            inset: 0,
            objectFit: (style as React.CSSProperties)?.objectFit || 'cover',
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
        decoding="async"
        style={style as React.CSSProperties}
        onError={handleError}
      />
    );
  }

  // For non-artwork remote images, use next/image with passthrough
  return (
    <Image
      {...restProps}
      src={currentSrc}
      alt={alt || ''}
      sizes={sizes}
      loader={({ src }) => src}
      unoptimized
      onError={(event) => {
        onError?.(event);
        const fallbackSrc = resolveArtworkImageFallbackUrl(currentSrc);
        if (fallbackSrc !== currentSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

/**
 * A wrapper for ExportedImage that handles both local and remote images.
 * - Local images: Uses next-image-export-optimizer
 * - Remote artwork images: Uses native img with srcSet for pre-generated variants
 * - Other remote images: Uses next/image with unoptimized passthrough
 */
export default function SafeImage({ src, ...props }: SafeImageProps) {
  const isRemote =
    typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));

  if (isRemote && typeof src === 'string') {
    const remoteProps = props as Omit<ComponentProps<typeof Image>, 'src'>;
    return <RemoteSafeImage src={src} {...remoteProps} />;
  }

  return <ExportedImage src={src} {...props} />;
}
