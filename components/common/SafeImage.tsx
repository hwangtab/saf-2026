'use client';

import ExportedImage from 'next-image-export-optimizer';
import type { ComponentProps } from 'react';

/**
 * A wrapper for ExportedImage that avoids optimization for remote images.
 * next-image-export-optimizer fails to optimize dynamic remote images at runtime,
 * leading to 404 errors. This component bypasses it for http/https URLs.
 */
export default function SafeImage({ src, ...props }: ComponentProps<typeof ExportedImage>) {
  const isRemote =
    typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'));

  if (isRemote) {
    // For remote images, bypass the export optimizer and use a standard img tag
    // or next/image with unoptimized if it was configured for it.
    // Given the 404 issues, a standard img with Next.js classes is safest.

    return (
      <img
        src={src}
        alt={props.alt || ''}
        className={props.className}
        style={{
          ...props.style,
          ...(props.fill
            ? {
                position: 'absolute',
                height: '100%',
                width: '100%',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                objectFit: props.className?.includes('object-charcoal') ? 'contain' : 'cover',
              }
            : {}),
        }}
      />
    );
  }

  return <ExportedImage src={src} {...props} />;
}
