/**
 * 매체별 진품 라벨 + 자긍심 박스 1줄 변동 — 매뉴얼 5.8·7.5
 *
 * Sprint 2 우선 5개 매체 적용 (회화·한국화·드로잉·판화·사후판화 = 전체 307점/77%).
 * 나머지 6개 매체(사진·디지털아트·조각·도자공예·아트프린트·혼합매체)는 Sprint 7 이후
 * Phase 2에서 12개월 안 추가 적용.
 *
 * 데이터 현실 (2026-05 시점):
 * - edition 필드 형식 불통일 ('에디션 6/20' vs '5/20' vs '1' vs 빈 문자열)
 * - edition_limit 거의 안 채워짐
 * - edition_type semantics 혼란 (open이 limited판 데이터 포함)
 * → 라벨 결정은 카테고리 우선, edition은 N/M 패턴 추출만 시도
 */

export interface MediumLabel {
  ko: string;
  en: string;
}

interface ArtworkForLabel {
  category?: string | null;
  edition?: string | null;
}

const GROUP_A_UNIQUE = ['회화', '한국화', '드로잉', '혼합매체'];

/**
 * `edition` 문자열에서 N/M 패턴 추출. '에디션 6/20' → ['6','20'], '5/20' → ['5','20'],
 * 매칭 실패 시 null.
 */
function parseEditionNumber(
  edition: string | null | undefined
): { current: string; total: string } | null {
  if (!edition) return null;
  const match = edition.match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  return { current: match[1], total: match[2] };
}

/**
 * 작품 카드·detail에 노출할 진품 라벨. Sprint 2 5 매체만 처리. 나머지는 null.
 */
export function getMediumLabel(artwork: ArtworkForLabel): MediumLabel | null {
  const cat = artwork.category;
  if (!cat) return null;

  // 그룹 A — Unique
  if (GROUP_A_UNIQUE.includes(cat)) {
    return { ko: '단 1점뿐인 원작', en: 'One-of-a-kind original' };
  }

  // 그룹 B — 판화 (생전)
  if (cat === '판화') {
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `한정판 ${parsed.current}/${parsed.total}`,
        en: `Limited edition ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '한정판', en: 'Limited edition' };
  }

  // 그룹 B — 사후판화 (재단·유족 인증)
  if (cat === '사후판화') {
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `사후 발행 한정판 ${parsed.current}/${parsed.total}`,
        en: `Posthumous limited edition ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '사후 발행 한정판', en: 'Posthumous limited edition' };
  }

  // Sprint 2 미적용 매체 (사진·디지털아트·조각·도자공예·아트프린트) — Phase 2
  return null;
}

/**
 * 자긍심 박스 1줄 변동 — 매뉴얼 7.5. 매체 그룹별 카피.
 */
export function getPrideBoxVariant(artwork: ArtworkForLabel): MediumLabel {
  const cat = artwork.category;

  if (cat && GROUP_A_UNIQUE.includes(cat)) {
    return {
      ko: '세상에 단 하나뿐인 한 점',
      en: 'One-of-a-kind in the world',
    };
  }

  if (cat === '판화') {
    const parsed = parseEditionNumber(artwork.edition);
    const total = parsed?.total;
    return {
      ko: total ? `${total}점만 발행된 한정판 중 한 점` : '한정 발행 중 하나의 한 점',
      en: total ? `One of only ${total} limited editions` : 'One of a limited edition',
    };
  }

  if (cat === '사후판화') {
    return {
      ko: '작가 재단 인증의 한정판 한 점',
      en: 'A foundation-certified limited edition',
    };
  }

  // 매뉴얼 7.5 다른 매체(사진·조각·디지털·아트프린트)는 Phase 2. 일단 기본값.
  return {
    ko: '세상에 단 하나뿐인 한 점',
    en: 'One-of-a-kind in the world',
  };
}
