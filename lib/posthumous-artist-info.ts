// 사후판화 작가 정보 정적 매핑.
//
// 박생광·오윤 작품 등록 시 Supabase artworks.category = '사후판화' 필수.
// 해당 컬럼이 없으면 PosthumousPrintDetails 컴포넌트가 렌더되지 않음 (운영 가이드).
//
// H4 인프라: edition/editionLimit DB 백필 시 artwork 데이터에서 자동 표시.
// DB edition='' 또는 NULL이면 PosthumousPrintDetails 내부 조건부 row(에디션)가 생략됨 — 의도된 동작.

export interface PosthumousArtistInfo {
  lifeYears: string;
  foundationKo: string;
  foundationEn: string;
  /** 작품 원본 출처 풀이 (매뉴얼 5.6 5번째 요소). 비어있으면 row 미노출. */
  originalWorkKo?: string;
  originalWorkEn?: string;
}

const POSTHUMOUS_ARTIST_MAP: Record<string, PosthumousArtistInfo> = {
  // 한국어 키 (artwork.artist raw — supabase-data.ts:132 name_ko 매핑)
  오윤: {
    lifeYears: '1946–1986',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
    originalWorkKo: '1980년대 목판화 원본에서 발행',
    originalWorkEn: 'Issued from original 1980s woodblock prints',
  },
  박생광: {
    lifeYears: '1904–1985',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
    originalWorkKo: '원본 채색화에서 발행',
    originalWorkEn: 'Issued from original coloured works',
  },
  // EN 키 (fragile guard — 향후 displayArtist(artist_en) 전달 시에도 매핑 보장)
  'O Yun': {
    lifeYears: '1946–1986',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
    originalWorkKo: '1980년대 목판화 원본에서 발행',
    originalWorkEn: 'Issued from original 1980s woodblock prints',
  },
  'Park Saenggwang': {
    lifeYears: '1904–1985',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
    originalWorkKo: '원본 채색화에서 발행',
    originalWorkEn: 'Issued from original coloured works',
  },
};

export function getPosthumousArtistInfo(artistName: string): PosthumousArtistInfo | null {
  return POSTHUMOUS_ARTIST_MAP[artistName] ?? null;
}
