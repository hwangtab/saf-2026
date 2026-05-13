/**
 * Artist 페이지 SEO 메타 오버라이드 — 작가별로 SEO title을 별도 지정.
 *
 * 사용 맥락: 일반 작가는 `artistArtworks.metaTitleWithCategory` 같은 generic message로 충분하지만,
 * 일부 작가는 특별 컨텍스트(현재 진행 중인 캠페인·청원·기획전 등)가 있어 SERP CTR 직격
 * 키워드가 필요. 메시지 키 분기보다 작가별 override가 우아함.
 *
 * description은 generic fallback 유지 — 가격대·재고 같은 실시간 데이터가 metaDescription에
 * 포함돼야 user intent 매칭이 강한데, override 정적 description은 그걸 잃는다.
 *
 * GSC 데이터 기반 매핑 (2026-04~05):
 * - "오윤 작가" 95 imp / 2 click — 청원 효과로 노출 폭증, generic title이 청원 의도 매칭 약함.
 *
 * 신규 작가도 점진 추가 가능. 매핑 없으면 자동으로 generic metaTitle fallback.
 */
export interface ArtistSeoOverride {
  titleKo?: string;
  titleEn?: string;
}

export const ARTIST_SEO_OVERRIDES: Record<string, ArtistSeoOverride> = {
  오윤: {
    // 1974년 구의동 벽화 멸실 위기 → /petition/oh-yoon 청원 진행 중 (2026-05-20 마감).
    // generic title이 단순 "오윤의 작품 N점" 형태라 청원·벽화 검색 의도 매칭 약함.
    titleKo: '오윤 — 한국 민중미술 거장, 구의동 벽화 청원 진행 중 | 씨앗페',
    titleEn: 'Oh Yoon — Korean Minjung Art Master, Mural Petition Active | SAF Online',
  },
};

/** 작가 이름(name_ko)으로 SEO 오버라이드 조회. 매핑 없으면 undefined. */
export function getArtistSeoOverride(artistName: string): ArtistSeoOverride | undefined {
  return ARTIST_SEO_OVERRIDES[artistName];
}
