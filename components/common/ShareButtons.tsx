'use client';

import { useState, useEffect } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { FacebookShareButton, TwitterShareButton, FacebookIcon, TwitterIcon } from 'react-share';
import clsx from 'clsx';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

type CopyStatus = 'idle' | 'copied' | 'error';

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    const KAKAO_JS_KEY = 'e1418881150fd27ee7ce629f1dba92bf'; // Public key, domain-restricted

    const initKakao = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_JS_KEY);
        setKakaoReady(true);
      } else if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
      }
    };

    // Check immediately
    if (typeof window !== 'undefined' && window.Kakao) {
      initKakao();
      return;
    }

    // Poll for Kakao SDK availability
    const timer = setInterval(() => {
      if (typeof window !== 'undefined' && window.Kakao) {
        initKakao();
        clearInterval(timer);
      }
    }, 500);

    // Stop polling after 10 seconds
    const timeout = setTimeout(() => {
      clearInterval(timer);
    }, 10000);

    return () => {
      clearInterval(timer);
      clearTimeout(timeout);
    };
  }, []);

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

  const handleKakaoShare = () => {
    if (typeof window !== 'undefined' && window.Kakao) {
      window.Kakao.Link.sendDefault({
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
            title: '웹사이트 방문',
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
      {/* Facebook */}
      <FacebookShareButton
        url={url}
        quote={title}
        hashtag="#씨앗페"
        className="hover:opacity-80 transition-opacity p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full"
      >
        <FacebookIcon size={32} round />
      </FacebookShareButton>

      {/* Twitter/X */}
      <TwitterShareButton
        url={url}
        title={title}
        className="hover:opacity-80 transition-opacity p-1.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full"
      >
        <TwitterIcon size={32} round />
      </TwitterShareButton>

      {/* Kakao Talk */}
      <button
        onClick={handleKakaoShare}
        disabled={!kakaoReady}
        className={clsx(
          'min-w-[44px] min-h-[44px] p-1.5 flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none rounded-full',
          !kakaoReady && 'opacity-50 cursor-not-allowed'
        )}
        title="카카오톡 공유"
        aria-label="카카오톡으로 공유하기"
      >
        <ExportedImage
          src="/images/free-icon-kakao-talk-3669973.png"
          alt="카카오톡"
          width={32}
          height={32}
          className="rounded-full"
        />
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full focus:outline-none"
        title="링크 복사"
        aria-label={
          copyStatus === 'copied'
            ? '링크가 복사되었습니다'
            : copyStatus === 'error'
              ? '복사 실패'
              : '링크 복사하기'
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
