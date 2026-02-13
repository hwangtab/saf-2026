'use client';

import ExportedImage from 'next-image-export-optimizer';
import Image from 'next/image';
import { useEffect, useState, type ComponentProps } from 'react';
import { resolveSupabaseOriginalPublicUrl } from '@/lib/utils';

type SafeImageProps = ComponentProps<typeof ExportedImage>;
const passthroughLoader = ({ src }: { src: string }) => src;

function RemoteSafeImage({
  src,
  ...props
}: { src: string } & Omit<ComponentProps<typeof Image>, 'src'>) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const { alt, onError, ...restProps } = props;

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  return (
    <Image
      {...restProps}
      src={currentSrc}
      alt={alt || ''}
      loader={passthroughLoader}
      unoptimized={props.unoptimized ?? true}
      onError={(event) => {
        onError?.(event);
        const fallbackSrc = resolveSupabaseOriginalPublicUrl(currentSrc);
        if (fallbackSrc !== currentSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

/**
 * A wrapper for ExportedImage that avoids optimization for remote images.
 * next-image-export-optimizer fails to optimize dynamic remote images at runtime,
 * leading to 404 errors. This component bypasses it for http/https URLs.
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
