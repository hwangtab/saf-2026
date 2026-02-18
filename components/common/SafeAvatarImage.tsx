'use client';

import { useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { resolveOptimizedArtworkImageUrl, resolveSupabaseOriginalPublicUrl } from '@/lib/utils';

type SafeAvatarImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
};

const PROFILE_STORAGE_MARKERS = [
  '/storage/v1/object/public/profiles/',
  '/storage/v1/render/image/public/profiles/',
] as const;
const AVATAR_WIDTHS = [64, 128, 256] as const;

function isProfileStorageUrl(url: string): boolean {
  return PROFILE_STORAGE_MARKERS.some((marker) => url.includes(marker));
}

function buildAvatarSrcSet(src: string): string {
  return AVATAR_WIDTHS.map((width) => {
    const transformed = resolveOptimizedArtworkImageUrl(src, {
      width,
      quality: 75,
      resize: 'cover',
    });
    return `${transformed} ${width}w`;
  }).join(', ');
}

export default function SafeAvatarImage({
  src,
  alt = '',
  onError,
  sizes,
  ...props
}: SafeAvatarImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const shouldTransform = useMemo(() => isProfileStorageUrl(src), [src]);
  const srcSet = useMemo(
    () => (shouldTransform ? buildAvatarSrcSet(src) : undefined),
    [src, shouldTransform]
  );

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <img
      {...props}
      src={currentSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes || '64px' : undefined}
      alt={alt}
      decoding="async"
      onError={(event) => {
        onError?.(event);
        const fallback = resolveSupabaseOriginalPublicUrl(currentSrc);
        if (fallback !== currentSrc) {
          setCurrentSrc(fallback);
        }
      }}
    />
  );
}
