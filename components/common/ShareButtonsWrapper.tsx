'use client';

import dynamic from 'next/dynamic';

import type { ComponentProps } from 'react';

// `ssr: false` must stay in a client boundary component.
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'), {
  ssr: false,
});

type ShareButtonsProps = ComponentProps<typeof ShareButtons>;

export default function ShareButtonsWrapper(props: ShareButtonsProps) {
  return <ShareButtons {...props} />;
}
