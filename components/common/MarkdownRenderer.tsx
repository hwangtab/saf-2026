import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import type { Components } from 'react-markdown';
import React from 'react';
import { Link } from '@/i18n/navigation';

function ImageFigure({ src, alt }: { src: string; alt?: string }) {
  return (
    <figure className="my-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? ''}
        className="w-full rounded-xl shadow-md object-cover"
        loading="lazy"
      />
      {alt && (
        <figcaption className="mt-3 text-center text-sm text-gray-500 leading-relaxed">
          {alt}
        </figcaption>
      )}
    </figure>
  );
}

const markdownComponents: Components = {
  img({ src, alt }) {
    if (!src || typeof src !== 'string') return null;
    return <ImageFigure src={src} alt={alt ?? undefined} />;
  },
  a({ href, children }) {
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
            작품 보러 가기 →
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

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: Props) {
  return (
    <div
      className={clsx(
        'prose prose-lg prose-gray max-w-none',
        // 문단 줄간격 및 여백
        'prose-p:leading-relaxed prose-p:mb-6',
        // 제목 간격 + 구분선
        'prose-headings:text-charcoal',
        'prose-h2:font-section prose-h2:font-normal prose-h2:mt-12 prose-h2:mb-5 prose-h2:pb-3 prose-h2:border-b prose-h2:border-gray-100',
        'prose-h3:font-section prose-h3:font-normal prose-h3:mt-8 prose-h3:mb-4',
        // 테이블 — 선 + 패딩
        'prose-table:border-collapse prose-table:w-full',
        'prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:font-semibold prose-th:text-charcoal prose-th:text-sm',
        'prose-td:border prose-td:border-gray-200 prose-td:px-4 prose-td:py-3 prose-td:align-top',
        'prose-tr:even:bg-gray-50/50',
        // 링크
        'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
        // 이미지
        'prose-img:rounded-xl prose-img:shadow-md',
        // 인용구
        'prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:not-italic',
        // 목록 간격
        'prose-li:mb-2',
        // 구분선
        'prose-hr:my-10 prose-hr:border-gray-200',
        // 강조
        'prose-strong:text-charcoal',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
