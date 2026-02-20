const HANGUL_SYLLABLE_BASE = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const HANGUL_JUNGSEONG_COUNT = 21;
const HANGUL_JONGSEONG_COUNT = 28;

const CHOSEONG_LIST = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

const JONGSEONG_COMPAT_LIST = [
  '',
  'ㄱ',
  'ㄲ',
  'ㄳ',
  'ㄴ',
  'ㄵ',
  'ㄶ',
  'ㄷ',
  'ㄹ',
  'ㄺ',
  'ㄻ',
  'ㄼ',
  'ㄽ',
  'ㄾ',
  'ㄿ',
  'ㅀ',
  'ㅁ',
  'ㅂ',
  'ㅄ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
] as const;

type HangulSyllableParts = {
  choseongIndex: number;
  jungseongIndex: number;
  jongseongIndex: number;
};

export function normalizeSearchText(value: string | null | undefined): string {
  return (value || '').toLowerCase().replace(/\s+/g, '');
}

export function hasHangulJamo(value: string | null | undefined): boolean {
  return /[ㄱ-ㅎㅏ-ㅣ]/.test(value || '');
}

function isHangulSyllable(char: string): boolean {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= HANGUL_SYLLABLE_BASE && code <= HANGUL_SYLLABLE_END;
}

function isCompatConsonant(char: string): boolean {
  return /[ㄱ-ㅎ]/.test(char);
}

function composeHangulSyllable(
  choseongIndex: number,
  jungseongIndex: number,
  jongseongIndex: number
): string {
  const code =
    HANGUL_SYLLABLE_BASE +
    (choseongIndex * HANGUL_JUNGSEONG_COUNT + jungseongIndex) * HANGUL_JONGSEONG_COUNT +
    jongseongIndex;
  return String.fromCharCode(code);
}

function getHangulSyllableParts(char: string): HangulSyllableParts | null {
  if (!isHangulSyllable(char)) return null;
  const code = char.charCodeAt(0) - HANGUL_SYLLABLE_BASE;
  const choseongIndex = Math.floor(code / (HANGUL_JUNGSEONG_COUNT * HANGUL_JONGSEONG_COUNT));
  const jungseongIndex = Math.floor(
    (code % (HANGUL_JUNGSEONG_COUNT * HANGUL_JONGSEONG_COUNT)) / HANGUL_JONGSEONG_COUNT
  );
  const jongseongIndex = code % HANGUL_JONGSEONG_COUNT;

  return {
    choseongIndex,
    jungseongIndex,
    jongseongIndex,
  };
}

function getTrailingConsonantExpandedQuery(query: string): string | null {
  if (!query) return null;
  const lastChar = query[query.length - 1];
  if (!lastChar) return null;

  const parts = getHangulSyllableParts(lastChar);
  if (!parts || parts.jongseongIndex === 0) return null;

  const trailingConsonant = JONGSEONG_COMPAT_LIST[parts.jongseongIndex];
  if (!trailingConsonant) return null;

  const withoutJongseong = composeHangulSyllable(parts.choseongIndex, parts.jungseongIndex, 0);
  return `${query.slice(0, -1)}${withoutJongseong}${trailingConsonant}`;
}

export function hasComposedTrailingConsonantQuery(value: string | null | undefined): boolean {
  const normalized = normalizeSearchText(value);
  if (!normalized || hasHangulJamo(normalized)) return false;
  return Boolean(getTrailingConsonantExpandedQuery(normalized));
}

function getSearchQueryCandidates(query: string | null | undefined): string[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const candidates = new Set([normalizedQuery]);

  if (!hasHangulJamo(normalizedQuery)) {
    const expandedQuery = getTrailingConsonantExpandedQuery(normalizedQuery);
    if (expandedQuery && expandedQuery !== normalizedQuery) {
      candidates.add(expandedQuery);
    }
  }

  return Array.from(candidates);
}

function charMatches(queryChar: string, targetChar: string): boolean {
  if (queryChar === targetChar) return true;

  if (isCompatConsonant(queryChar)) {
    const targetParts = getHangulSyllableParts(targetChar);
    if (!targetParts) return false;
    return CHOSEONG_LIST[targetParts.choseongIndex] === queryChar;
  }

  const queryParts = getHangulSyllableParts(queryChar);
  const targetParts = getHangulSyllableParts(targetChar);
  if (!queryParts || !targetParts) return false;

  if (
    queryParts.choseongIndex !== targetParts.choseongIndex ||
    queryParts.jungseongIndex !== targetParts.jungseongIndex
  ) {
    return false;
  }

  // Query without jongseong should match any syllable with same 초/중성 (e.g. '유' matches '윤')
  if (queryParts.jongseongIndex === 0) return true;
  return queryParts.jongseongIndex === targetParts.jongseongIndex;
}

function includesHangulPattern(target: string, query: string): boolean {
  if (!target || !query || query.length > target.length) return false;

  for (let start = 0; start <= target.length - query.length; start += 1) {
    let isMatch = true;
    for (let offset = 0; offset < query.length; offset += 1) {
      if (!charMatches(query[offset], target[start + offset])) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) return true;
  }

  return false;
}

export function matchesSearchText(
  source: string | null | undefined,
  query: string | null | undefined
): boolean {
  const queryCandidates = getSearchQueryCandidates(query);
  if (queryCandidates.length === 0) return true;

  const normalizedSource = normalizeSearchText(source);
  if (!normalizedSource) return false;

  return queryCandidates.some((queryCandidate) => {
    if (normalizedSource.includes(queryCandidate)) return true;
    return includesHangulPattern(normalizedSource, queryCandidate);
  });
}

export function matchesAnySearch(
  query: string | null | undefined,
  sources: Array<string | null | undefined>
): boolean {
  return sources.some((source) => matchesSearchText(source, query));
}
