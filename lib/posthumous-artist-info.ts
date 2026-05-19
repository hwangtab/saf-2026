export interface PosthumousArtistInfo {
  lifeYears: string;
  foundationKo: string;
  foundationEn: string;
}

const POSTHUMOUS_ARTIST_MAP: Record<string, PosthumousArtistInfo> = {
  오윤: {
    lifeYears: '1946–1986',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
  },
  박생광: {
    lifeYears: '1904–1985',
    foundationKo: '유족·재단 인증',
    foundationEn: 'Estate & foundation authorized',
  },
};

export function getPosthumousArtistInfo(artistName: string): PosthumousArtistInfo | null {
  return POSTHUMOUS_ARTIST_MAP[artistName] ?? null;
}
