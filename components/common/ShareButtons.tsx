'use client';

import { useState } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import FacebookShareButton from 'react-share/lib/FacebookShareButton';
import TwitterShareButton from 'react-share/lib/TwitterShareButton';
import FacebookIcon from 'react-share/lib/FacebookIcon';
import TwitterIcon from 'react-share/lib/TwitterIcon';
import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useKakaoShareSDK } from '@/lib/hooks/useKakaoSDK';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const locale = useLocale();
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
          imageUrl: `${window.location.origin}/images/og-image.png`,
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
      <FacebookShareButton
        url={url}
        quote={title}
        hashtag={locale === 'en' ? '#SAF2026' : '#씨앗페'}
        className="hover:opacity-80 transition-opacity p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <FacebookIcon size={32} round iconFillColor="white" />
      </FacebookShareButton>

      {/* Twitter/X */}
      <TwitterShareButton
        url={url}
        title={title}
        className="hover:opacity-80 transition-opacity p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <TwitterIcon size={32} round />
      </TwitterShareButton>

      {/* Kakao Talk */}
      <button
        onClick={handleKakaoShare}
        disabled={!hasAppKey || kakaoLoading}
        className={clsx(
          'min-w-[44px] min-h-[44px] p-1.5 flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full',
          (!hasAppKey || kakaoLoading) && 'opacity-50 cursor-not-allowed'
        )}
        title={hasAppKey ? t('kakaoButtonTitle') : t('kakaoNeedKey')}
        aria-label={t('kakaoAria')}
      >
        <ExportedImage
          src="/images/free-icon-kakao-talk-3669973.png"
          alt={t('kakaoIconAlt')}
          width={32}
          height={32}
          className="rounded-full"
        />
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
            'w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200',
            copyStatus === 'copied' && 'bg-green-500 text-white',
            copyStatus === 'error' && 'bg-red-500 text-white',
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
