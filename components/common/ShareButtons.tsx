'use client';

import { useState } from 'react';
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

export default function ShareButtons({
  url,
  title,
  description,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

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
      <span className="text-sm font-medium text-gray-700">공유하기:</span>

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
        className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center hover:bg-yellow-500 transition-colors"
        title="카카오톡 공유"
        aria-label="카카오톡으로 공유하기"
      >
        <span className="text-xs font-bold">K</span>
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
