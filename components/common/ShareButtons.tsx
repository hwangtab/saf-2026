'use client';

import { useState, useEffect } from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
} from 'react-share';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}


const KakaoSvgIcon = () => (
  <svg
    width={32}
    height={32}
    viewBox="0 0 32 32"
    role="img"
    aria-hidden
  >
    <circle cx={16} cy={16} r={16} fill="#FEE500" />
    <path
      d="M16 9c-5.52 0-10 3.35-10 7.48 0 2.82 2.03 5.27 5.07 6.58l-.97 3.64a.5.5 0 0 0 .74.54l4.11-2.28c.33.03.67.05 1.01.05 5.52 0 10-3.35 10-7.49C25.95 12.35 21.52 9 16 9Z"
      fill="#381E1F"
    />
    <text
      x="16"
      y="18"
      textAnchor="middle"
      fontFamily="GMarketSans, Arial, sans-serif"
      fontWeight="700"
      fontSize="6"
      fill="#FEE500"
    >
      TALK
    </text>
  </svg>
);

export default function ShareButtons({
  url,
  title,
  description,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // Initialize Kakao SDK
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Kakao && !window.Kakao.isInitialized()) {
      // Kakao SDK is loaded but not initialized
      // Note: Requires NEXT_PUBLIC_KAKAO_JS_KEY environment variable
      const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
      if (kakaoKey) {
        window.Kakao.init(kakaoKey);
      }
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
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
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-sm font-medium text-charcoal">공유하기:</span>

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
      <TwitterShareButton
        url={url}
        title={title}
        className="hover:opacity-80 transition-opacity"
      >
        <TwitterIcon size={32} round />
      </TwitterShareButton>

      {/* Kakao Talk - if Kakao SDK is available */}
      <button
        onClick={handleKakaoShare}
        className="w-8 h-8 flex items-center justify-center transition-transform hover:scale-105 focus:outline-none focus-visible:outline-none"
        title="카카오톡 공유"
        aria-label="카카오톡으로 공유하기"
      >
        <KakaoSvgIcon />
      </button>

      {/* Copy Link */}
      <button
        onClick={handleCopyLink}
        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
        title="링크 복사"
      >
        {copied ? '✓ 복사됨' : '링크 복사'}
      </button>
    </div>
  );
}
