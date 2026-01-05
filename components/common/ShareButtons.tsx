'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FacebookShareButton, TwitterShareButton, FacebookIcon, TwitterIcon } from 'react-share';
import clsx from 'clsx';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  useEffect(() => {
    const initKakao = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
        if (kakaoKey) {
          window.Kakao.init(kakaoKey);
          setKakaoReady(true);
        }
      } else if (window.Kakao?.isInitialized()) {
        setKakaoReady(true);
      }
    };

    if (typeof window !== 'undefined') {
      if (window.Kakao) {
        initKakao();
        return undefined;
      } else {
        window.addEventListener('load', initKakao);
        return () => window.removeEventListener('load', initKakao);
      }
    }
    return undefined;
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyError(true);
      setTimeout(() => setCopyError(false), 2000);
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
        className="hover:opacity-80 transition-opacity"
      >
        <FacebookIcon size={32} round />
      </FacebookShareButton>

      {/* Twitter/X */}
      <TwitterShareButton url={url} title={title} className="hover:opacity-80 transition-opacity">
        <TwitterIcon size={32} round />
      </TwitterShareButton>

      {/* Kakao Talk */}
      <button
        onClick={handleKakaoShare}
        disabled={!kakaoReady}
        className={clsx(
          'w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none',
          !kakaoReady && 'opacity-50 cursor-not-allowed'
        )}
        title="카카오톡 공유"
        aria-label="카카오톡으로 공유하기"
      >
        <Image
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
        className={clsx(
          'w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200',
          copied && 'bg-green-500 text-white',
          copyError && 'bg-red-500 text-white',
          !copied && !copyError && 'bg-gray-200 text-gray-600 hover:bg-gray-300'
        )}
        title="링크 복사"
        aria-label={copied ? '링크가 복사되었습니다' : copyError ? '복사 실패' : '링크 복사하기'}
      >
        {copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : copyError ? (
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
      </button>
    </div>
  );
}
