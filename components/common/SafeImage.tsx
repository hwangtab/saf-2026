'use client';

import ExportedImage from 'next-image-export-optimizer';
import Image from 'next/image';
import type { ComponentProps } from 'react';

type SafeImageProps = ComponentProps<typeof ExportedImage>;
const passthroughLoader = ({ src }: { src: string }) => src;

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
    const { alt, ...restProps } = remoteProps;

    return (
      <Image
        {...restProps}
        src={src}
        alt={alt || ''}
        loader={passthroughLoader}
        unoptimized={props.unoptimized ?? true}
      />
    );
  }

  return <ExportedImage src={src} {...props} />;
}
