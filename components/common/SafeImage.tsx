'use client';

import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

/**
 * 이미지 컴포넌트 — Vercel Image Optimization 기반.
 *
 * 주요 동작:
 * - Supabase Storage render endpoint URL(`/render/image/public/...?width=X&quality=Y`)을
 *   raw object URL(`/object/public/...`)로 자동 변환. Vercel Edge가 변환·캐시·전송 일임.
 * - 호출처는 transform URL을 그대로 보내도 자동으로 정리되므로 인터페이스 변경 없음.
 * - onError 시 1x1 투명 PNG로 graceful fallback (깨진 이미지 아이콘 방지).
 *
 * 마이그레이션 배경: 기존 `next-image-export-optimizer` + Supabase render endpoint 조합은
 * Cloudflare cache(max-age=3600) 의존이라 PSI Lighthouse cf-cache MISS 시 LCP 9.6초 측정.
 * Vercel Image Optimization은 한국 edge + 장기 immutable cache → 첫 방문자에게도 안정.
 */

// 1x1 투명 PNG. base64가 손상되면 브라우저가 ERR_INVALID_URL을 내며 fallback이
// 다시 깨지므로, 디코드 가능한 canonical 값을 사용한다.
const TRANSPARENT_FALLBACK =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP8//8/AwAFAAH/f29sAAAAAElFTkSuQmCC';

const SUPABASE_RENDER_PATH = '/storage/v1/render/image/public/';
const SUPABASE_OBJECT_PATH = '/storage/v1/object/public/';

/**
 * Supabase render endpoint URL → raw object URL 변환.
 * Vercel Image Optimization이 raw URL을 받아 자체 변환해 Edge 캐시.
 * 이미 raw URL이면 그대로 반환.
 */
function toRawSupabaseUrl(src: string): string {
  if (!src.includes(SUPABASE_RENDER_PATH)) return src;
  const [pathPart] = src.split('?');
  return pathPart.replace(SUPABASE_RENDER_PATH, SUPABASE_OBJECT_PATH);
}

function normalizeSrc(src: ImageProps['src']): ImageProps['src'] {
  if (typeof src !== 'string') return src;
  if (!src.startsWith('http://') && !src.startsWith('https://')) return src;
  return toRawSupabaseUrl(src);
}

export default function SafeImage({ src, alt, onError, ...props }: ImageProps) {
  if (process.env.NODE_ENV !== 'production' && alt === undefined) {
    console.warn('[SafeImage] Missing alt prop. Pass alt="" for decorative images.', { src });
  }

  const normalized = normalizeSrc(src);
  const [failed, setFailed] = useState(false);

  // src가 바뀌면 직전 실패 상태를 리셋한다. 그렇지 않으면 한 번 깨진 이미지 슬롯을
  // 재사용(슬라이더·갤러리 교체)할 때 새 src도 계속 투명 PNG로 표시됨.
  // 렌더 중 state 조정 — React 공식 권장 패턴(이펙트 불필요).
  const [prevSrc, setPrevSrc] = useState(src);
  if (src !== prevSrc) {
    setPrevSrc(src);
    setFailed(false);
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    onError?.(event);
    if (!failed) setFailed(true);
  };

  return (
    <Image
      {...props}
      src={failed ? TRANSPARENT_FALLBACK : normalized}
      alt={alt ?? ''}
      onError={handleError}
    />
  );
}
