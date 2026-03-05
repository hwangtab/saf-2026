'use client';

import dynamic from 'next/dynamic';

import type { ComponentProps } from 'react';

// `ssr: false` must stay in a client boundary component.
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'), {
  ssr: false,
  loading: () => (
    <div className="w-[220px] h-10 rounded-md bg-white/20 animate-pulse" aria-hidden="true" />
  ),
});

type ShareButtonsProps = ComponentProps<typeof ShareButtons>;

export default function ShareButtonsWrapper(props: ShareButtonsProps) {
  return <ShareButtons {...props} />;
}
