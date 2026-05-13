'use client';

import dynamic from 'next/dynamic';

import type { ComponentProps } from 'react';

// `ssr: false` must stay in a client boundary component.
// placeholder는 실제 ShareButtons의 layout과 정확히 동일하게 reserve — hydrate 시 swap이
// 일어나도 layout shift 0. 과거 placeholder(220×40px)와 실 버튼(5×44px + 4×8px gap = 252×44)
// 차이가 `/petition/oh-yoon` CLS 1.0 회귀의 가설 1 strong 원인이었음 (text-center 안 border
// box가 그 자리를 차지하며 viewport 절반 이상 push).
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="min-w-[44px] min-h-[44px] rounded-full bg-white/20 animate-pulse" />
      ))}
    </div>
  ),
});

type ShareButtonsProps = ComponentProps<typeof ShareButtons>;

export default function ShareButtonsWrapper(props: ShareButtonsProps) {
  return <ShareButtons {...props} />;
}
