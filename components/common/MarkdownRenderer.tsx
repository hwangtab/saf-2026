import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import type { Components } from 'react-markdown';
import React from 'react';
import { Link } from '@/i18n/navigation';
import { resolveOptimizedArtworkImageUrl } from '@/lib/utils';

function isSafeHref(href: string | undefined): href is string {
  if (!href) return false;
  const lower = href.toLowerCase().trim();
  return !lower.startsWith('javascript:') && !lower.startsWith('data:');
}

const ARTWORK_STORAGE_HINT = '/storage/v1/object/public/artworks/';
const ARTWORK_RENDER_HINT = '/storage/v1/render/image/public/artworks/';
// Article body max-width is ~720px (prose). Cover 1x/2x DPR up to 1440w.
const BODY_IMG_WIDTHS = [400, 720, 1080, 1440] as const;
const BODY_IMG_DEFAULT_WIDTH = 1080;
const BODY_IMG_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 720px';

function isArtworkStorageUrl(src: string): boolean {
  return src.includes(ARTWORK_STORAGE_HINT) || src.includes(ARTWORK_RENDER_HINT);
}

function ImageFigure({ src, alt }: { src: string; alt?: string }) {
  const useTransform = isArtworkStorageUrl(src);
  const displaySrc = useTransform
    ? resolveOptimizedArtworkImageUrl(src, { width: BODY_IMG_DEFAULT_WIDTH, quality: 75 })
    : src;
  const srcSet = useTransform
    ? BODY_IMG_WIDTHS.map((w) => {
        const url = resolveOptimizedArtworkImageUrl(src, { width: w, quality: 75 });
        return `${url} ${w}w`;
      }).join(', ')
    : undefined;

  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        srcSet={srcSet}
        sizes={srcSet ? BODY_IMG_SIZES : undefined}
        alt={alt ?? ''}
        className="w-full rounded-xl shadow-md object-cover"
        loading="lazy"
        decoding="async"
      />
      {alt && (
        <figcaption className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

function createMarkdownComponents(locale: string = 'ko'): Components {
  return {
    img({ src, alt }) {
      if (!src || typeof src !== 'string') return null;
      return <ImageFigure src={src} alt={alt ?? undefined} />;
    },
    a({ href, children }) {
      if (!isSafeHref(href)) return <>{children}</>;
      // [![alt](img)](/artworks/id) → 클릭 가능한 figure
      const childArray = React.Children.toArray(children);
      if (
        href &&
        childArray.length === 1 &&
        React.isValidElement(childArray[0]) &&
        childArray[0].type === ImageFigure
      ) {
        return (
          <a
            href={href}
            className="block group no-underline hover:no-underline [&>figure>img]:transition-[transform,box-shadow] [&>figure>img]:duration-300 [&>figure>img]:group-hover:shadow-lg [&>figure>img]:group-hover:scale-[1.01]"
          >
            {children}
            <span className="block text-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity -mt-2 mb-4">
              {locale === 'en' ? 'View artwork →' : '작품 보러 가기 →'}
            </span>
          </a>
        );
      }
      // 내부 링크 (작품 페이지 등) — i18n 라우팅
      if (href && !href.startsWith('http')) {
        return <Link href={href}>{children}</Link>;
      }
      // 외부 링크
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };
}

interface Props {
  content: string;
  className?: string;
  locale?: string;
}

export default function MarkdownRenderer({ content, className, locale = 'ko' }: Props) {
  return (
    <div
      className={clsx(
        'prose prose-lg prose-gray max-w-none',
        // 문단 줄간격 및 여백
        'prose-p:leading-relaxed prose-p:mb-6',
        // 제목 간격 + 구분선
        'prose-headings:text-charcoal',
        'prose-h2:font-section prose-h2:font-bold prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-gray-100',
        'prose-h3:font-section prose-h3:font-bold prose-h3:mt-8 prose-h3:mb-4',
        // 테이블 — 선 + 패딩
        'prose-table:border-collapse prose-table:w-full',
        'prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-charcoal prose-th:text-sm',
        'prose-td:border prose-td:border-gray-200 prose-td:px-4 prose-td:py-3 prose-td:align-top',
        'prose-tr:even:bg-gray-50/50',
        // 링크
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // 이미지
        'prose-img:rounded-xl prose-img:shadow-md',
        // 인용구 — prose 기본 자동 따옴표 제거 (본문에 이미 따옴표가 있을 때 중복 방지)
        'prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic',
        '[&_blockquote_p:first-of-type]:before:content-none [&_blockquote_p:last-of-type]:after:content-none',
        // 목록 간격
        'prose-li:mb-2',
        // 구분선
        'prose-hr:my-10 prose-hr:border-gray-200',
        // 강조
        'prose-strong:text-charcoal',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={createMarkdownComponents(locale)}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
