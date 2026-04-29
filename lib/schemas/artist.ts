import { SITE_URL } from '@/lib/constants';
import { resolveSeoArtworkImageUrl } from './utils';

export interface ArtistSchemaInput {
  name: string;
  description?: string;
  image?: string;
  url: string;
  jobTitle?: string;
  /**
   * 외부 권위 링크 (Wikipedia, MMCA, 작가 홈페이지/SNS 등). Google Knowledge Graph
   * entity 연결의 핵심 시그널. 빈 배열은 sameAs 필드 자체를 schema에서 생략.
   */
  sameAs?: readonly string[];
}

// Enhanced artist schema input for SEO optimization
export interface EnhancedArtistSchemaInput extends ArtistSchemaInput {
  history?: string;
  artworks?: Array<{ id: string; title: string; image: string }>;
}

/** sameAs URL 정규화 + 중복 제거. 빈 문자열 / null / undefined 제거. */
function normalizeSameAs(urls: readonly (string | null | undefined)[] | undefined): string[] {
  if (!urls || urls.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u) continue;
    const trimmed = u.trim();
    if (!trimmed || !trimmed.startsWith('http')) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

// Helper: Extract expertise topics from artist history/profile
function extractKnowsAbout(history?: string, profile?: string): string[] {
  const text = `${history || ''} ${profile || ''}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string> = {
    유화: 'Oil Painting',
    oil: 'Oil Painting',
    아크릴: 'Acrylic Painting',
    acrylic: 'Acrylic Painting',
    목판화: 'Woodcut Printmaking',
    판화: 'Printmaking',
    사진: 'Photography',
    조각: 'Sculpture',
    설치: 'Installation Art',
    미디어: 'Media Art',
    수채화: 'Watercolor',
    동양화: 'East Asian Painting',
    서양화: 'Western Painting',
    옻칠: 'Lacquer Art',
    도자: 'Ceramics',
    캘리그래피: 'Calligraphy',
  };

  Object.entries(topicMap).forEach(([korean, english]) => {
    if (text.includes(korean)) {
      topics.push(english);
    }
  });

  return [...new Set(topics)].slice(0, 5);
}

// Helper: Extract credentials (education, awards) from artist history
interface Credential {
  type: 'degree' | 'award';
  name: string;
  institution?: string;
}

function parseArtistCredentials(history?: string): Credential[] {
  if (!history) return [];
  const credentials: Credential[] = [];

  // Parse education lines
  const eduPatterns = [
    /(.+대학교?.+(?:졸업|석사|박사|수료))/g,
    /(.+대학원.+(?:졸업|석사|박사|수료))/g,
  ];

  eduPatterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const line = match[1].trim();
      if (line.length < 100) {
        credentials.push({
          type: 'degree',
          name: line,
          institution: line.match(/(.+대학)/)?.[1],
        });
      }
    }
  });

  // Parse awards
  const awardPatterns = [/(.+(?:상|대상|우수상|특선|입선).+)/g, /(.+수상.+)/g];

  awardPatterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const line = match[1].trim();
      if (line.length < 100 && !credentials.some((c) => c.name === line)) {
        credentials.push({
          type: 'award',
          name: line,
        });
      }
    }
  });

  return credentials.slice(0, 8);
}

// Helper: Extract memberships/associations from artist history
function extractMemberships(history?: string): Array<{ '@type': string; name: string }> {
  if (!history) return [];
  const memberships: Array<{ '@type': string; name: string }> = [];

  const patterns = [/한국(\w+)(?:협회|회)/g, /(\w+)협회 회원/g, /(\w+)작가회/g];

  patterns.forEach((pattern) => {
    const matches = history.matchAll(pattern);
    for (const match of matches) {
      const name = match[0].replace(' 회원', '').trim();
      if (name.length < 30 && !memberships.some((m) => m.name === name)) {
        memberships.push({
          '@type': 'Organization',
          name,
        });
      }
    }
  });

  return memberships.slice(0, 5);
}

export function generateArtistSchema(artist: ArtistSchemaInput) {
  const sameAs = normalizeSameAs(artist.sameAs);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': artist.url,
    name: artist.name,
    description: artist.description,
    image: artist.image
      ? (() => {
          const resolved = resolveSeoArtworkImageUrl(artist.image!);
          return resolved.startsWith('http') ? resolved : `${SITE_URL}${resolved}`;
        })()
      : undefined,
    url: artist.url,
    jobTitle: artist.jobTitle || 'Artist',
    // 외부 권위 링크 (Wikipedia, MMCA, 작가 홈페이지/SNS 등) — Knowledge Graph entity 연결
    ...(sameAs.length > 0 && { sameAs }),
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': `${artist.url}#webpage`,
    },
  };
}

/**
 * Generate enhanced artist schema with credentials, expertise, and work samples
 */
export function generateEnhancedArtistSchema(artist: EnhancedArtistSchemaInput) {
  const knowsAbout = extractKnowsAbout(artist.history, artist.description);
  const credentials = parseArtistCredentials(artist.history);
  const memberships = extractMemberships(artist.history);
  const sameAs = normalizeSameAs(artist.sameAs);

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': artist.url,
    name: artist.name,
    description: artist.description,
    image: artist.image
      ? (() => {
          const resolved = resolveSeoArtworkImageUrl(artist.image!);
          return resolved.startsWith('http') ? resolved : `${SITE_URL}${resolved}`;
        })()
      : undefined,
    url: artist.url,
    jobTitle: artist.jobTitle || 'Visual Artist',
    nationality: {
      '@type': 'Country',
      name: 'South Korea',
      '@id': 'https://www.wikidata.org/wiki/Q884',
    },
    // 외부 권위 링크 (Wikipedia, MMCA, 작가 홈페이지/SNS 등) — Knowledge Graph entity 연결
    ...(sameAs.length > 0 && { sameAs }),
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': `${artist.url}#webpage`,
    },
    // Expertise areas
    ...(knowsAbout.length > 0 && { knowsAbout }),
    // Education and awards
    ...(credentials.length > 0 && {
      hasCredential: credentials.map((cred) => ({
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: cred.type === 'degree' ? 'degree' : 'award',
        name: cred.name,
        ...(cred.institution && {
          recognizedBy: {
            '@type': 'Organization',
            name: cred.institution,
          },
        }),
      })),
    }),
    // Organization memberships
    ...(memberships.length > 0 && { memberOf: memberships }),
    // Work samples (representative artworks)
    ...(artist.artworks &&
      artist.artworks.length > 0 && {
        workSample: artist.artworks.slice(0, 5).map((work) => {
          const resolvedImg = resolveSeoArtworkImageUrl(work.image);
          const absImg = resolvedImg.startsWith('http') ? resolvedImg : `${SITE_URL}${resolvedImg}`;
          return {
            '@type': 'VisualArtwork',
            '@id': `${SITE_URL}/artworks/${work.id}`,
            name: work.title,
            url: `${SITE_URL}/artworks/${work.id}`,
            image: absImg,
          };
        }),
      }),
  };
}
