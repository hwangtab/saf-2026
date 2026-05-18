/**
 * 매체별 진품 라벨 + 자긍심 박스 1줄 변동 — 매뉴얼 5.8·7.5
 *
 * 11개 전체 매체 적용 (매뉴얼 5.8·5.10 기준).
 *
 * 데이터 현실 (2026-05 시점):
 * - edition 필드 형식 불통일 ('에디션 6/20' vs '5/20' vs '1' vs 빈 문자열)
 * - edition_limit 거의 안 채워짐
 * - edition_type semantics 혼란 (open이 limited판 데이터 포함)
 * → 라벨 결정은 카테고리 우선, edition은 N/M 패턴 추출만 시도
 * → 조각·도자공예: edition_type='unique' 명시 시 "1점" 라벨, 그 외는 한정 주조 시도
 */

export interface MediumLabel {
  ko: string;
  en: string;
}

interface ArtworkForLabel {
  category?: string | null;
  edition?: string | null;
  edition_type?: string | null;
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
 * 작품 카드·detail에 노출할 진품 라벨. 매뉴얼 5.8 마스터 표 11개 매체 전체 처리.
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

  // 그룹 B — 사진 (인화 방식은 DB에 없어 라벨만)
  if (cat === '사진') {
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `한정판 ${parsed.current}/${parsed.total}`,
        en: `Limited edition ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '한정판', en: 'Limited edition' };
  }

  // 그룹 B — 디지털아트
  if (cat === '디지털아트') {
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `디지털 한정판 ${parsed.current}/${parsed.total}`,
        en: `Digital limited edition ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '디지털 한정판', en: 'Digital limited edition' };
  }

  // 그룹 C — 조각 (edition_type='unique' 명시 시 1점, 아니면 한정 주조 시도)
  if (cat === '조각') {
    if (artwork.edition_type === 'unique') {
      return { ko: '단 1점뿐인 조각', en: 'One-of-a-kind sculpture' };
    }
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `한정 주조 ${parsed.current}/${parsed.total}`,
        en: `Limited cast ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '단 1점뿐인 조각', en: 'One-of-a-kind sculpture' };
  }

  // 그룹 C — 도자공예 (edition_type='unique' 명시 시 1점, 아니면 기본)
  if (cat === '도자공예') {
    if (artwork.edition_type === 'unique') {
      return { ko: '단 1점뿐인 도자', en: 'One-of-a-kind ceramic' };
    }
    const parsed = parseEditionNumber(artwork.edition);
    if (parsed) {
      return {
        ko: `한정 ${parsed.current}/${parsed.total}`,
        en: `Limited edition ${parsed.current}/${parsed.total}`,
      };
    }
    return { ko: '단 1점뿐인 도자', en: 'One-of-a-kind ceramic' };
  }

  // 그룹 C — 아트프린트 (인쇄물 격하 회피 — "작가 인증 한정 발행작")
  if (cat === '아트프린트') {
    return { ko: '작가 인증 한정 발행작', en: 'Artist-certified print' };
  }

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

  if (cat === '사진') {
    const parsed = parseEditionNumber(artwork.edition);
    const total = parsed?.total;
    return {
      ko: total ? `${total}점 한정 발행의 한 점` : '한정 발행의 한 점',
      en: total ? `One of only ${total} limited prints` : 'One of a limited edition',
    };
  }

  if (cat === '조각') {
    if (artwork.edition_type === 'unique') {
      return {
        ko: '세상에 같은 작품이 없는 한 조각',
        en: 'A sculpture with no equal in the world',
      };
    }
    const parsed = parseEditionNumber(artwork.edition);
    const total = parsed?.total;
    return {
      ko: total ? `한정 주조 ${total}점 중 하나` : '한정 주조 중 하나',
      en: total ? `One of only ${total} limited casts` : 'One of a limited cast',
    };
  }

  if (cat === '도자공예') {
    return {
      ko: '세상에 단 하나뿐인 한 점',
      en: 'One-of-a-kind in the world',
    };
  }

  if (cat === '디지털아트') {
    const parsed = parseEditionNumber(artwork.edition);
    const total = parsed?.total;
    return {
      ko: total ? `${total}점 한정의 디지털 한정판 한 점` : '한정의 디지털 한정판 한 점',
      en: total
        ? `One of only ${total} digital limited editions`
        : 'One of a digital limited edition',
    };
  }

  if (cat === '아트프린트') {
    return {
      ko: '작가 인증 한정 발행의 한 점',
      en: 'One of an artist-certified limited edition',
    };
  }

  return {
    ko: '세상에 단 하나뿐인 한 점',
    en: 'One-of-a-kind in the world',
  };
}
