/**
 * 한국 언론사명 영문 매핑 — DB news.source는 KO 단일 값(스키마에 source_en 컬럼 부재)이라
 * 코드 매핑으로 영문 라벨 제공. 목록 페이지·detail 페이지 양쪽에서 import.
 *
 * 신규 outlet 추가 시 이곳만 갱신하면 list/detail 모두 자동 반영.
 * 향후 DB 컬럼 추가하면 이 map은 fallback으로 활용 가능.
 */
const SOURCE_NAME_MAP: Record<string, { ko: string; en: string }> = {
  한겨레: { ko: '한겨레', en: 'Hankyoreh' },
  '월간 믹싱': { ko: '월간 믹싱', en: 'Mixing Magazine' },
  뉴스아트: { ko: '뉴스아트', en: 'NewsArt' },
  아시아경제: { ko: '아시아경제', en: 'Asia Economy' },
  ABC뉴스: { ko: 'ABC뉴스', en: 'ABC News' },
  소셜임팩트뉴스: { ko: '소셜임팩트뉴스', en: 'Social Impact News' },
  경기종합뉴스: { ko: '경기종합뉴스', en: 'Gyeonggi News' },
  공직신문: { ko: '공직신문', en: 'Public Service News' },
  이로운넷: { ko: '이로운넷', en: 'Ilon Net' },
  EBN: { ko: 'EBN', en: 'EBN' },
};

export function localizeNewsSource(source: string | null | undefined, locale: 'ko' | 'en'): string {
  if (!source) return '';
  const mapped = SOURCE_NAME_MAP[source];
  if (!mapped) return source;
  return locale === 'en' ? mapped.en : mapped.ko;
}
