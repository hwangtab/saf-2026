'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

interface ShareKitProps {
  url: string;
  /** 사전 작성된 공유 문구 (기본: 슬로건). 카카오·문자·SNS 별 분기는 추후 확장 가능. */
  text: string;
  /**
   * 'dark' = 다크 배경 위 (HERO 등) — 흰색 반투명 버튼.
   * 'light' = 밝은 배경 위 (청원 박스 canvas 등) — primary 강조 + 어두운 텍스트.
   */
  tone?: 'dark' | 'light';
  className?: string;
}

// Kakao SDK 글로벌 타입은 types/kakao.d.ts에서 이미 정의됨.
function ensureKakaoInit(): boolean {
  if (typeof window === 'undefined') return false;
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window.Kakao === 'undefined') return false;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key);
  }
  return window.Kakao.isInitialized();
}

export default function ShareKit({ url, text, tone = 'dark', className }: ShareKitProps) {
  const t = useTranslations('petition.ohYoon');
  const [copied, setCopied] = useState(false);

  function shareKakao() {
    if (!ensureKakaoInit() || !window.Kakao?.Share) {
      shareSms();
      return;
    }
    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: text,
        description: '오윤의 작품을 시민의 품으로',
        imageUrl: `${url.split('/petition')[0]}/og-petition-oh-yoon.png`,
        link: { mobileWebUrl: url, webUrl: url },
      },
      buttons: [
        {
          title: t('heroCta'),
          link: { mobileWebUrl: url, webUrl: url },
        },
      ],
    });
  }

  function shareFacebook() {
    const u = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  function shareTwitter() {
    const u = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    window.open(u, '_blank', 'noopener,noreferrer');
  }

  function shareSms() {
    const body = encodeURIComponent(`${text}\n${url}`);
    window.location.href = `sms:?&body=${body}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 거부 — 사용자에게 별도 알림 없음. fallback 미구현 */
    }
  }

  const buttonClass = clsx(
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none',
    tone === 'dark'
      ? 'bg-white/15 hover:bg-white/25 text-white focus-visible:ring-2 focus-visible:ring-white/60'
      : 'bg-white border border-gray-300 hover:border-primary hover:text-primary text-charcoal-deep focus-visible:ring-2 focus-visible:ring-primary'
  );

  return (
    <div className={clsx('flex flex-wrap gap-2 justify-center', className)}>
      <button type="button" onClick={shareKakao} className={buttonClass}>
        {t('shareKakao')}
      </button>
      <button type="button" onClick={shareFacebook} className={buttonClass}>
        {t('shareFacebook')}
      </button>
      <button type="button" onClick={shareTwitter} className={buttonClass}>
        {t('shareTwitter')}
      </button>
      <button type="button" onClick={shareSms} className={buttonClass}>
        {t('shareSms')}
      </button>
      <button type="button" onClick={copyLink} className={buttonClass}>
        {copied ? t('shareCopied') : t('shareCopy')}
      </button>
    </div>
  );
}
