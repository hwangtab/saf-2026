/**
 * 작가별 외부 권위 링크 매핑 — Person schema의 `sameAs`로 송출되어 Google Knowledge Graph
 * entity 연결 신뢰도 향상. GSC Performance상 작가 검색 노출 다수에 클릭 0인 페이지들이
 * page 1로 진입하는 데 중요한 시그널.
 *
 * 추가 가이드:
 * - 위키백과(한/영), 국립현대미술관(MMCA) 작가 페이지, 권위 있는 매체 인터뷰 등을 권장
 * - 작가 본인의 SNS·홈페이지는 Supabase artists.homepage / artists.instagram 필드로 별도 관리되어
 *   런타임에 자동 합쳐짐 (이 매핑은 외부 권위 출처 전용)
 * - 키는 한글 정식 이름(NFC 정규화 결과). artists.name_ko와 일치해야 함
 */
export const ARTIST_EXTERNAL_LINKS: Record<string, readonly string[]> = {
  오윤: ['https://ko.wikipedia.org/wiki/오윤_(화가)'],
  박재동: ['https://ko.wikipedia.org/wiki/박재동'],
  신학철: ['https://en.wikipedia.org/wiki/Shin_Hak-chul'],
};

/** 작가 이름으로 외부 권위 링크 조회. 매핑 없으면 빈 배열. */
export function getArtistExternalLinks(nameKo: string): readonly string[] {
  return ARTIST_EXTERNAL_LINKS[nameKo.normalize('NFC').trim()] ?? [];
}
