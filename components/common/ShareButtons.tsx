'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useKakaoShareSDK } from '@/lib/hooks/useKakaoSDK';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
  /**
   * 카카오톡 공유 시 사용할 썸네일 절대 URL.
   * 미지정 시 사이트 기본 OG 이미지(/images/og-image.jpg) 사용.
   * 페이지별로 캠페인 hero 이미지를 보내고 싶을 때 명시.
   */
  imageUrl?: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

const SHARE_BUTTON_CLASS =
  'hover:opacity-80 transition-opacity p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2';

function openSharePopup(shareUrl: string) {
  window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=400');
}

export default function ShareButtons({ url, title, description, imageUrl }: ShareButtonsProps) {
  const t = useTranslations('shareButtons');
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [kakaoStatusMessage, setKakaoStatusMessage] = useState('');
  const {
    isReady: kakaoReady,
    loading: kakaoLoading,
    error: kakaoError,
    hasAppKey,
    ensureLoaded,
  } = useKakaoShareSDK();

  const handleFacebookShare = () => {
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`;
    openSharePopup(fbUrl);
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
    openSharePopup(twitterUrl);
  };

  const handleSmsShare = () => {
    const body = encodeURIComponent(`${title}\n${url}`);
    window.location.href = `sms:?&body=${body}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  const handleKakaoShare = async () => {
    if (!hasAppKey || kakaoLoading) {
      if (!hasAppKey) {
        setKakaoStatusMessage(t('kakaoUnavailable'));
      }
      return;
    }

    setKakaoStatusMessage('');

    if (!kakaoReady) {
      const loaded = await ensureLoaded();
      if (!loaded) {
        console.error('Failed to prepare Kakao Share SDK', kakaoError);
        setKakaoStatusMessage(t('kakaoPrepareFailed'));
        return;
      }
    }

    if (!window.Kakao) {
      setKakaoStatusMessage(t('kakaoPrepareFailed'));
      return;
    }

    // Use Kakao.Share (v2) instead of Kakao.Link (deprecated)
    const shareMethod = window.Kakao.Share || window.Kakao.Link;

    if (shareMethod) {
      shareMethod.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: description,
          imageUrl: imageUrl ?? `${window.location.origin}/images/og-image.jpg`,
          link: {
            webUrl: url,
            mobileWebUrl: url,
          },
        },
        buttons: [
          {
            title: t('kakaoVisitWebsite'),
            link: {
              webUrl: url,
              mobileWebUrl: url,
            },
          },
        ],
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="sr-only" aria-live="polite">
        {kakaoStatusMessage}
      </span>

      {/* Facebook */}
      <button
        type="button"
        onClick={handleFacebookShare}
        className={SHARE_BUTTON_CLASS}
        aria-label={t('facebookAria')}
      >
        <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#1877F2" />
          <path
            d="M42.525 41.142l1.573-10.257h-9.847V24.09c0-2.806 1.374-5.542 5.783-5.542h4.474V9.638S40.67 9 36.996 9c-7.68 0-12.698 4.655-12.698 13.084v7.8H15.69v10.258h8.608V64h10.595V41.142h8.632z"
            fill="#fff"
          />
        </svg>
      </button>

      {/* Twitter/X */}
      <button
        type="button"
        onClick={handleTwitterShare}
        className={SHARE_BUTTON_CLASS}
        aria-label={t('twitterAria')}
      >
        <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#000" />
          <path
            d="M36.652 29.13L47.74 16h-2.628l-9.628 11.396L27.176 16H17l11.627 17.228L17 47.248h2.628l10.164-12.03L38.824 47.248H49L36.652 29.13zm-3.597 4.258l-1.178-1.716L20.41 17.96h4.035l7.563 11.02 1.178 1.716 9.833 14.323h-4.035l-8.03-11.63z"
            fill="#fff"
          />
        </svg>
      </button>

      {/* Kakao Talk */}
      <button
        type="button"
        onClick={handleKakaoShare}
        disabled={!hasAppKey || kakaoLoading}
        className={clsx(
          SHARE_BUTTON_CLASS,
          (!hasAppKey || kakaoLoading) && 'opacity-50 cursor-not-allowed'
        )}
        title={hasAppKey ? t('kakaoButtonTitle') : t('kakaoNeedKey')}
        aria-label={t('kakaoAria')}
      >
        <Image
          src="/images/free-icon-kakao-talk-3669973.png"
          alt={t('kakaoIconAlt')}
          width={32}
          height={32}
          className="rounded-full"
        />
      </button>

      {/* SMS — 모바일 공유 (sms: URL 스킴, 데스크톱은 OS 메시지 앱이 받음) */}
      <button
        type="button"
        onClick={handleSmsShare}
        className={SHARE_BUTTON_CLASS}
        title={t('smsTitle')}
        aria-label={t('smsAria')}
      >
        <svg className="w-8 h-8" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="32" fill="#1F2428" />
          <path
            d="M32 16c-9.94 0-18 6.94-18 15.5 0 4.7 2.43 8.9 6.27 11.74-.27 1.93-1.07 4.4-2.83 6.65-.3.38-.04.95.44.84 3.84-.84 7.06-2.67 9.06-4.09C28.74 47.21 30.34 47.4 32 47.4c9.94 0 18-6.94 18-15.5S41.94 16 32 16zm-8 17.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
            fill="#fff"
          />
        </svg>
      </button>

      {/* Copy Link */}
      <button
        type="button"
        onClick={handleCopyLink}
        className={SHARE_BUTTON_CLASS}
        title={t('copyLinkTitle')}
        aria-label={
          copyStatus === 'copied'
            ? t('copied')
            : copyStatus === 'error'
              ? t('copyFailed')
              : t('copyLink')
        }
      >
        <div
          className={clsx(
            'w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200',
            copyStatus === 'copied' && 'bg-success text-white',
            copyStatus === 'error' && 'bg-danger text-white',
            copyStatus === 'idle' && 'bg-gray-200 text-gray-600 hover:bg-gray-300'
          )}
        >
          {copyStatus === 'copied' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : copyStatus === 'error' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
}
