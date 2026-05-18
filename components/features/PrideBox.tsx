import { getPrideBoxVariant } from '@/lib/medium-labels';
import { LOAN_COUNT } from '@/lib/site-stats';

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
 * Sprint 2에서는 1단 첫 구매자 카피만 적용. 매뉴얼 7.6 누적 단계별 변동(2·3·4단)은
 * 위시리스트 2단계 도입 후 Phase 2에 추가.
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

export default function PrideBox({ artwork, locale = 'ko' }: PrideBoxProps) {
  const variant = getPrideBoxVariant(artwork);
  const isEn = locale === 'en';
  const loanCountFormatted = LOAN_COUNT.toLocaleString(isEn ? 'en-US' : 'ko-KR');

  const head = isEn ? 'Two beginnings made by one piece' : '이 한 점이 만드는 두 개의 시작';
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

  return (
    <section
      aria-labelledby="pride-box-heading"
      className="mt-16 mb-12 mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-canvas-soft px-6 py-10 md:px-10 md:py-12 shadow-sm"
    >
      <h2
        id="pride-box-heading"
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
    </section>
  );
}
