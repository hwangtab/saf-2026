import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { resolveOptimizedArtworkImageUrl } from '@/lib/utils';
import type { Components } from 'react-markdown';

const ARTWORK_LINK_PATTERN =
  /^\/(?:en\/)?artworks\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
function isInternalArtworkLink(href: string): boolean {
  return ARTWORK_LINK_PATTERN.test(href);
}

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

/**
 * react-markdown `img` 콜백 — module-level 함수로 분리해 element identity 검사
 * ({@link elementRendersFigure})가 minify 후에도 안전하게 동작하게 한다.
 */
const MarkdownImage: NonNullable<Components['img']> = ({ src, alt }) => {
  if (!src || typeof src !== 'string') return null;
  return <ImageFigure src={src} alt={alt ?? undefined} />;
};

/**
 * 본문에 `[![alt](img)](/artworks/uuid)` 또는 단독 이미지 라인이 있을 때, react-markdown은
 * 이를 `<p>` 안에 감싼다. 우리 `img` 콜백이 `<figure>` (block-level)를 렌더하면
 * `<p><figure>...</figure></p>`라는 **invalid HTML**이 SSR로 송출된다. 브라우저 파서는
 * `<figure>` 직전에 `<p>`를 자동 종료해 SSR DOM과 다른 트리를 만들고, 결과적으로
 * React 19 hydration mismatch (#418) 발생 (commit c391a8d0·07244912·3b77e20b 계열).
 *
 * `<p>` children 안에 figure/이미지 링크가 있으면 paragraph wrapping 자체를 제거해
 * `<figure>`가 형제로 정상 렌더되도록 한다.
 *
 * 검출 로직: react-markdown은 `<p>`의 children에 **렌더 전** React element (커스텀 컴포넌트
 * 함수 reference)를 패스한다. element의 `type`이 우리 커스텀 `img` 콜백(MarkdownImage)
 * 또는 그 컴포넌트가 렌더하는 `ImageFigure` 자체이거나, 그를 children으로 감싼
 * `<a>`/`<Link>`이면 block-level로 판정.
 */
function elementRendersFigure(element: React.ReactElement): boolean {
  const type = element.type as unknown;
  return type === ImageFigure || type === MarkdownImage;
}

function containsBlockLevelChild(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;
    if (elementRendersFigure(child)) return true;
    // `<a>` 또는 `<Link>`가 image-link 패턴: 자식에 figure를 렌더하는 element가 있으면 block.
    const props = child.props as { children?: React.ReactNode } | undefined;
    if (props?.children) {
      return React.Children.toArray(props.children).some(
        (inner) => React.isValidElement(inner) && elementRendersFigure(inner)
      );
    }
    return false;
  });
}

function createMarkdownComponents(locale: string = 'ko'): Components {
  return {
    p({ children }) {
      // figure/image-link이 안에 있으면 `<p>` 제거 — invalid HTML 방지 (위 주석 참조).
      if (containsBlockLevelChild(children)) {
        return <>{children}</>;
      }
      return <p>{children}</p>;
    },
    img: MarkdownImage,
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
            <span className="block text-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity -mt-2 mb-4 inline-flex items-center justify-center gap-1">
              {locale === 'en' ? 'View artwork' : '작품 보러 가기'}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </span>
          </a>
        );
      }
      // 내부 링크 (작품 페이지 등) — i18n 라우팅
      if (href && !href.startsWith('http')) {
        // /artworks/{uuid} plain-text 링크는 "구매 가능한 작품" 신호를 강화 — primary
        // 색상 + bold + 작은 외부-이동 아이콘으로 prose 흐름을 깨지 않으면서 product
        // link임을 명확히 표시. (image-link 패턴 [![](thumb)](/artworks/...)는 위
        // ImageFigure 분기에서 별도 처리됨.)
        if (isInternalArtworkLink(href)) {
          return (
            <Link
              href={href}
              className="text-primary font-semibold no-underline hover:underline underline-offset-2 inline-flex items-baseline gap-0.5"
            >
              {children}
              <ArrowUpRight
                className="h-3 w-3 self-center opacity-70 shrink-0"
                aria-hidden="true"
              />
            </Link>
          );
        }
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
      // 모든 기존 prose-* modifier 정의는 globals.css의 .markdown-content 클래스로 이전.
      // @tailwindcss/typography 의존 제거 — 메인 페이지 CSS chunk에서 미사용 prose 정의
      // 31KB raw가 함께 번들되던 문제 해결.
      className={clsx('markdown-content', className)}
    >
      <ReactMarkdown
        // singleTilde: false — GFM strict 모드. 단일 `~text~`를 strikethrough로 해석하지 않고
        // 일반 텍스트로 처리. 한국어 가격·연도 범위 표기("1970~80년대", "₩500만~900만",
        // "50만~150만원" 등)가 strikethrough 구분자로 잘못 잡히던 회귀 차단.
        // GFM 정식 strikethrough는 `~~text~~`(이중 tilde) 형태로만 동작.
        remarkPlugins={[[remarkGfm, { singleTilde: false }]]}
        components={createMarkdownComponents(locale)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
