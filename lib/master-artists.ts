/**
 * 한국 현대미술 거장 라인업 — 매뉴얼 6.4 [E] + 9.2 컬렉션 2 기반, **운영 결정 반영**.
 *
 * 매뉴얼 9.2는 6명(오윤·박생광·신학철·민정기·이철수·박불똥)을 권장하나, 운영 정책상
 * 작가가 의도적으로 hidden 상태일 수 있음 → 라인업은 **운영 큐레이션 결과**가 우선.
 *
 * 현재 라인업 (2026-05-14): 오윤·박생광·민정기·이철수·박불똥 (5명).
 * - **신학철 제외**: 작품 전체가 의도적 비공개(is_hidden) 상태. 카드 cover 이미지 fetch 실패 +
 *   작가 페이지가 비어 있어 deep-link 의미 없음. user 운영 결정으로 hidden 유지.
 *
 * 라인업 변경 시: lib/emerging-artists.ts의 MASTER_ARTIST_NAMES 동기화 필수
 * (Sprint 4a/4c PR merge 후 import로 통합 예정).
 *
 * 정적 정의 — Supabase 부담 없이 빌드 시점에 카드 메타 확정. 작가별 대표작 이미지는
 * MasterArtists 컴포넌트에서 `getSupabaseArtworksByArtist` 첫 항목 fetch로 동적 결정.
 */

export interface MasterArtist {
  /** Supabase artworks.artist 컬럼과 정확히 일치해야 deep-link 동작. */
  artistName: string;
  artistNameEn: string;
  /** 생몰년 — 매뉴얼 6.4 [E] "오윤 (1946-1986)" 패턴. 생존 작가는 trailing dash 유지. */
  yearsKo: string;
  yearsEn: string;
  /** 한 줄 정체성 (매체·운동·미술사적 위치). 카드 부제로 노출. */
  taglineKo: string;
  taglineEn: string;
  /** /special/<slug> 페이지가 있으면 카드 클릭 시 작품 목록 대신 특별전 페이지로 이동. */
  specialSlug?: string;
}

export const MASTER_ARTISTS: MasterArtist[] = [
  {
    artistName: '오윤',
    artistNameEn: 'Oh Yoon',
    yearsKo: '1946–1986',
    yearsEn: '1946–1986',
    taglineKo: '한국 민중미술의 거장',
    taglineEn: 'Master of Korean minjung art',
    specialSlug: 'oh-yoon',
  },
  {
    artistName: '박생광',
    artistNameEn: 'Park Saeng-gwang',
    yearsKo: '1904–1985',
    yearsEn: '1904–1985',
    taglineKo: '오방색 한국화의 거장',
    taglineEn: 'Master of obangsaek Korean painting',
    specialSlug: 'park-saenggwang',
  },
  {
    artistName: '민정기',
    artistNameEn: 'Min Joung-ki',
    yearsKo: '1949–',
    yearsEn: 'b. 1949',
    taglineKo: '한국 풍경화의 거장',
    taglineEn: 'Master of Korean landscape painting',
    specialSlug: 'min-joungki',
  },
  {
    artistName: '이철수',
    artistNameEn: 'Lee Chul-soo',
    yearsKo: '1954–',
    yearsEn: 'b. 1954',
    taglineKo: '판화·서화 거장',
    taglineEn: 'Master of prints and brushwork',
    specialSlug: 'lee-cheolsoo',
  },
  {
    artistName: '박불똥',
    artistNameEn: 'Park Bul-ttong',
    yearsKo: '1956–',
    yearsEn: 'b. 1956',
    taglineKo: '콜라주·정치 미술의 거장',
    taglineEn: 'Master of collage and political art',
    specialSlug: 'park-buldong',
  },
];
