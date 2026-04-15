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
  alt,
  onError,
  sizes,
  ...props
}: SafeAvatarImageProps) {
  if (process.env.NODE_ENV !== 'production' && alt === undefined) {
    console.warn('[SafeAvatarImage] Missing alt prop. Pass alt="" for decorative avatars.', {
      src,
    });
  }

  const resolvedAlt = alt ?? '';
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
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- {...props} spread로 onError 등 이벤트를 수신하는 이미지 컴포넌트
    <img
      {...props}
      src={currentSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes || '64px' : undefined}
      alt={resolvedAlt}
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
