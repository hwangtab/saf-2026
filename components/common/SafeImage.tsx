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

const ARTWORK_STORAGE_MARKER = '/storage/v1/object/public/artworks/';
const ARTWORK_VARIANT_SUFFIX_REGEX = /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png)$/i;

const VARIANT_WIDTHS: Record<string, number> = {
  thumb: 400,
  card: 960,
  detail: 1600,
  hero: 1920,
  original: 2560,
};

function isArtworkStorageUrl(url: string): boolean {
  return url.includes(ARTWORK_STORAGE_MARKER) && ARTWORK_VARIANT_SUFFIX_REGEX.test(url);
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
  const srcSet = useMemo(
    () => (isArtwork ? generateArtworkSrcSet(src) : undefined),
    [src, isArtwork]
  );

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  // For artwork images with pre-generated variants, use native img with srcSet
  if (isArtwork && srcSet) {
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
          sizes={effectiveSizes}
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
        sizes={effectiveSizes}
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
