'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FacebookShareButton, TwitterShareButton, FacebookIcon, TwitterIcon } from 'react-share';

interface ShareButtonsProps {
  url: string;
  title: string;
  description: string;
}

export default function ShareButtons({ url, title, description }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

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
        className="w-8 h-8 flex items-center justify-center transition-opacity hover:opacity-80 focus:outline-none"
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
        className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
        title="링크 복사"
      >
        {copyError ? '❌ 실패' : copied ? '✓ 복사됨' : '🔗 복사'}
      </button>
    </div>
  );
}
