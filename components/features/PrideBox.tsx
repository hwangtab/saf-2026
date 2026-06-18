'use client';

import { useSyncExternalStore } from 'react';
import { getPrideBoxVariant } from '@/lib/medium-labels';
import { LOAN_COUNT } from '@/lib/site-stats';
import { getPurchaseCount, getPurchaseStage } from '@/lib/purchase-state';

/**
 * 자긍심 박스 — 매뉴얼 8.3 표준 5줄 카피 + 7.5 매체별 1줄 변동.
 *
 * 작품 상세페이지 [13] 페이지 가장 아래에 배치 (작품 detail 흐름의 마지막).
 * 매뉴얼 8.2 회복 서사 4원칙:
 * - 결말: 회복 (작가의 한 달·동료 작가의 길)
 * - 주체: 행위자(컬렉터)
 * - 시간: 현재진행형 ("만드는·열리는")
 * - 위치: 작품 detail 마지막 — About 정체성 영역
 *
 * 죄책감 0%, 자긍심 100%.
 *
 * 매뉴얼 7.6 누적 구매 단계별 변동:
 * - 1단 (첫 구매, count=0): 기본 5줄 카피 그대로
 * - 2단 (2~3번째, count=1-2): 헤드 "당신의 N번째 한 점 — 그리고 두 개의 시작"
 * - 3단 (4~9번째, count=3-8): 헤드 "N번째 작품을 알아본 컬렉터에게" + 컬렉터 인정 라인
 * - 4단 (10번째+, count=9+): 헤드 "한국 현대미술의 길을 함께 걷고 있는 분께" + 헌신 컬렉터 라인
 *
 * SSR에서는 count=0(1단)으로 렌더. 마운트 후 localStorage를 읽어 단계 갱신(2·3·4단).
 */

interface PrideBoxProps {
  /** 작품의 카테고리·edition 정보. Part 7.5 매체별 1줄 변동에 사용. */
  artwork: {
    category?: string | null;
    edition?: string | null;
    edition_type?: string | null;
  };
  /** 영문 분기. 기본 한국어. */
  locale?: 'ko' | 'en';
}

function enOrdinal(n: number): string {
  const rem = n % 100;
  if (rem >= 11 && rem <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

// useSyncExternalStore: SSR은 getServerSnapshot(=0)으로 렌더, 마운트 후 getSnapshot()으로
// localStorage 값 읽어 재렌더. setState-in-effect ESLint rule 위반 없음.
function subscribeStorage(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

export default function PrideBox({ artwork, locale = 'ko' }: PrideBoxProps) {
  const purchaseCount = useSyncExternalStore(
    subscribeStorage,
    getPurchaseCount,
    () => 0 // server snapshot
  );

  const variant = getPrideBoxVariant(artwork);
  const isEn = locale === 'en';
  const loanCountFormatted = LOAN_COUNT.toLocaleString(isEn ? 'en-US' : 'ko-KR');

  const stage = getPurchaseStage(purchaseCount);
  const n = purchaseCount + 1; // 이번 구매가 N번째

  let head: string;
  if (stage === 1) {
    head = isEn ? 'Two beginnings made by one piece' : '이 한 점이 만드는 두 개의 시작';
  } else if (stage === 2) {
    head = isEn
      ? `Your ${enOrdinal(n)} work — and two new beginnings`
      : `당신의 ${n}번째 한 점 — 그리고 두 개의 시작`;
  } else if (stage === 3) {
    head = isEn
      ? `To the collector choosing their ${enOrdinal(n)}`
      : `${n}번째 작품을 알아본 컬렉터에게`;
  } else {
    // 매뉴얼 7.6 4단: "한국 현대미술의 길을 함께 걷고 있는 분께"
    head = isEn
      ? 'To those walking the path of Korean contemporary art'
      : '한국 현대미술의 길을 함께 걷고 있는 분께';
  }

  const line1Label = isEn ? 'For you' : '당신에게는';
  const line1Value = isEn ? variant.en : variant.ko;
  const line2Label = isEn ? 'For the artist' : '작가에게는';
  const line2Value = isEn ? 'the next month of their practice' : '다음 작업의 한 달';
  const line3Label = isEn ? 'For a fellow artist' : '동료 작가에게는';
  // 매뉴얼 8.3 한국어 원문 "새로 열리는 ₩3,000,000의 길"은 그대로. 영문은 단순 직역(₩ 기호 단독)이
  // 영문 화폐 컨벤션과 충돌해 부자연스러워, 의미(저금리 상호부조 대출 길)를 보강한 자연스러운 영문.
  const line3Value = isEn
    ? 'a new ₩3,000,000 path of low-interest support'
    : '새로 열리는 ₩3,000,000의 길';
  // SuccessClient / 결제 이메일 자긍심 박스와 "회복의 길" 키워드 통일 — 매뉴얼 8.5/8.6 회복 서사 톤 정합.
  const footer = isEn
    ? `${loanCountFormatted} artists have walked this path of recovery; 95% returned to open it for the next.`
    : `${loanCountFormatted}명이 이 회복의 길을 걸었고, 95%가 다음 사람을 위해 돌아왔습니다.`;

  // 3단·4단 마무리 — 매뉴얼 7.6
  // 3단 head는 n(이번이 N번째), closing은 purchaseCount(기존 보유 수) — 의도된 이중 인정.
  // "9번째를 고를 때 이미 8점 보유"처럼 자연스럽게 공존.
  // 3단 매뉴얼 원문 "354명 중 N번째 컬렉터입니다"는 전체 대출 건수(LOAN_COUNT)와
  // 개인 누적 구매 N이 다른 차원이라 의미 오류 — 컬렉터 인정 톤으로 대체.
  // 4단은 매뉴얼 verbatim: "${N}번째 작품으로 작가의 길에 추가됩니다".
  const collectorLine =
    stage === 3
      ? isEn
        ? `With ${purchaseCount} works in your collection, you're exactly the collector this platform is here for.`
        : `${purchaseCount}점을 소장한 당신은, 이 플랫폼이 함께하고 싶은 컬렉터입니다.`
      : stage === 4
        ? isEn
          ? `Your ${enOrdinal(n)} work — each one has opened another step on an artist's path.`
          : `${n}번째 작품으로 작가의 길에 추가됩니다.`
        : null;

  return (
    <section
      aria-labelledby="pride-box-heading"
      className="mt-16 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-canvas-soft px-6 py-10 md:px-10 md:py-12 shadow-sm"
    >
      {/* suppressHydrationWarning: SSR(1단)과 마운트 후(2·3·4단) 텍스트 차이 무시 */}
      <h2
        id="pride-box-heading"
        suppressHydrationWarning
        className="text-2xl md:text-3xl font-bold text-charcoal-deep text-center mb-8 text-balance"
      >
        {head}
      </h2>
      <dl className="space-y-4 text-base md:text-lg text-charcoal">
        <div className="flex flex-col sm:flex-row sm:gap-3">
          <dt className="font-semibold text-charcoal-deep min-w-[7rem]">{line1Label} —</dt>
          <dd className="text-charcoal">{line1Value}</dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-3">
          <dt className="font-semibold text-charcoal-deep min-w-[7rem]">{line2Label} —</dt>
          <dd className="text-charcoal">{line2Value}</dd>
        </div>
        <div className="flex flex-col sm:flex-row sm:gap-3">
          <dt className="font-semibold text-charcoal-deep min-w-[7rem]">{line3Label} —</dt>
          <dd className="text-charcoal">{line3Value}</dd>
        </div>
      </dl>
      <p className="mt-8 pt-6 border-t border-gray-200 text-sm md:text-base text-charcoal-muted text-center text-balance">
        {footer}
      </p>
      {collectorLine && (
        <p className="mt-3 text-sm text-charcoal-muted text-center text-balance">{collectorLine}</p>
      )}
    </section>
  );
}
