// 뉴스레터 블록 스키마 — 단일 출처.
// 편집기(admin)·이메일 템플릿(emails/newsletter.tsx)·웹 아카이브가 모두 이 타입을 소비한다.
// 메인 앱에 zod 의존성이 없어 손수 작성한 파서로 런타임 검증 (발송 직전 방어).
// optional 필드 없음 — 빈 값은 ''(JSONB 왕복·strict 타입 단순화). 렌더러는 truthy 검사.

import { htmlToEmailText } from '@/lib/email/rich-content';

export interface ArtworkSnapshot {
  title: string;
  artistName: string;
  imageUrl: string;
  description: string;
  price: string; // '' = 가격 정보 없음
  url: string; // 작품 상세 절대 URL
}

export interface CoverBlock {
  id: string;
  type: 'cover';
  title: string;
  subtitle: string;
  imageUrl: string;
}

export interface TextBlock {
  id: string;
  type: 'text';
  html: string; // TipTap 산출 — 저장 시 sanitizeRichEmailHtml 통과(액션 레이어 책임)
}

export interface ArtworkCardBlock {
  id: string;
  type: 'artworkCard';
  artworkId: string;
  showPrice: boolean;
  snapshot: ArtworkSnapshot; // 삽입 시점 복사 — 발송물 불변 원칙
}

export interface EventBannerBlock {
  id: string;
  type: 'eventBanner';
  title: string;
  dateText: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  label: string;
  url: string;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
}

export type NewsletterBlock =
  | CoverBlock
  | TextBlock
  | ArtworkCardBlock
  | EventBannerBlock
  | ButtonBlock
  | DividerBlock;

export const NEWSLETTER_BLOCK_LABELS: Record<NewsletterBlock['type'], string> = {
  cover: '커버',
  text: '텍스트',
  artworkCard: '작품 카드',
  eventBanner: '이벤트 배너',
  button: 'CTA 버튼',
  divider: '구분선',
};

const isStr = (v: unknown): v is string => typeof v === 'string';
const isHttpUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
// 빈 값 허용 이미지 URL — 값이 있으면 http(s)여야 한다
const isOptionalHttpUrl = (v: unknown): v is string => v === '' || isHttpUrl(v);

function fail(index: number, reason: string): never {
  throw new Error(`블록 ${index}: ${reason}`);
}

function parseBlock(raw: unknown, index: number): NewsletterBlock {
  if (typeof raw !== 'object' || raw === null) fail(index, '객체가 아닙니다.');
  const o = raw as Record<string, unknown>;
  if (!isStr(o.id) || !o.id) fail(index, 'id가 없습니다.');
  const id = o.id;

  switch (o.type) {
    case 'cover': {
      if (!isStr(o.title) || !isStr(o.subtitle)) fail(index, 'cover 필드가 잘못됐습니다.');
      if (!isOptionalHttpUrl(o.imageUrl)) fail(index, 'cover imageUrl은 http(s)여야 합니다.');
      return { id, type: 'cover', title: o.title, subtitle: o.subtitle, imageUrl: o.imageUrl };
    }
    case 'text': {
      if (!isStr(o.html)) fail(index, 'text html이 없습니다.');
      return { id, type: 'text', html: o.html };
    }
    case 'artworkCard': {
      if (!isStr(o.artworkId) || !o.artworkId) fail(index, 'artworkId가 없습니다.');
      if (typeof o.showPrice !== 'boolean') fail(index, 'showPrice가 없습니다.');
      const s = o.snapshot as Record<string, unknown> | null | undefined;
      if (
        typeof s !== 'object' ||
        s === null ||
        !isStr(s.title) ||
        !isStr(s.artistName) ||
        !isStr(s.description) ||
        !isStr(s.price) ||
        !isHttpUrl(s.imageUrl) ||
        !isHttpUrl(s.url)
      ) {
        fail(index, 'artworkCard snapshot 필드가 잘못됐습니다.');
      }
      return {
        id,
        type: 'artworkCard',
        artworkId: o.artworkId,
        showPrice: o.showPrice,
        snapshot: {
          title: s.title,
          artistName: s.artistName,
          imageUrl: s.imageUrl,
          description: s.description,
          price: s.price,
          url: s.url,
        },
      };
    }
    case 'eventBanner': {
      if (!isStr(o.title) || !isStr(o.dateText) || !isStr(o.ctaLabel)) {
        fail(index, 'eventBanner 필드가 잘못됐습니다.');
      }
      if (!isOptionalHttpUrl(o.imageUrl)) fail(index, 'eventBanner imageUrl은 http(s)여야 합니다.');
      if (!isHttpUrl(o.ctaUrl)) fail(index, 'eventBanner ctaUrl은 http(s)여야 합니다.');
      return {
        id,
        type: 'eventBanner',
        title: o.title,
        dateText: o.dateText,
        imageUrl: o.imageUrl,
        ctaLabel: o.ctaLabel,
        ctaUrl: o.ctaUrl,
      };
    }
    case 'button': {
      if (!isStr(o.label)) fail(index, 'button label이 없습니다.');
      if (!isHttpUrl(o.url)) fail(index, 'button url은 http(s)여야 합니다.');
      return { id, type: 'button', label: o.label, url: o.url };
    }
    case 'divider':
      return { id, type: 'divider' };
    default:
      fail(index, `알 수 없는 type '${String(o.type)}'`);
  }
}

// 실패 시 throw — 발송 직전 검증이 목적이므로 조용한 drop(콘텐츠 누락) 대신 전체 거부.
export function parseNewsletterBlocks(raw: unknown): NewsletterBlock[] {
  if (!Array.isArray(raw)) throw new Error('blocks는 배열이어야 합니다.');
  return raw.map((b, i) => parseBlock(b, i));
}

// 이메일 text/plain 버전 — email_broadcasts.body_text로 저장돼 기존 디스패처가 그대로 사용.
export function blocksToText(blocks: NewsletterBlock[]): string {
  const parts: string[] = [];
  for (const b of blocks) {
    switch (b.type) {
      case 'cover':
        parts.push([b.title, b.subtitle].filter(Boolean).join('\n'));
        break;
      case 'text':
        parts.push(htmlToEmailText(b.html));
        break;
      case 'artworkCard':
        parts.push(
          [
            `${b.snapshot.title} — ${b.snapshot.artistName}`,
            b.snapshot.description,
            b.showPrice && b.snapshot.price ? b.snapshot.price : '',
            b.snapshot.url,
          ]
            .filter(Boolean)
            .join('\n')
        );
        break;
      case 'eventBanner':
        parts.push([b.title, b.dateText, `${b.ctaLabel}: ${b.ctaUrl}`].filter(Boolean).join('\n'));
        break;
      case 'button':
        parts.push(`${b.label}: ${b.url}`);
        break;
      case 'divider':
        break;
    }
  }
  return parts.filter(Boolean).join('\n\n');
}
