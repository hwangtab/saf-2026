/**
 * ARTIST_DATA에서 명단의 작가 profile/profile_en을 추출해 Supabase UPDATE SQL을 stdout에 덤프.
 * Usage: npx tsx scripts/dump-artist-profiles.ts > /tmp/artist-bio-update.sql
 */
import { ARTIST_DATA } from '../content/artists-data';

const TARGETS = [
  '김규학',
  '김동석',
  '김영서',
  '김우주',
  '리호',
  '민정See',
  '박수지',
  '박지혜',
  '백금아',
  '서금앵',
  '송광연',
  '신건우',
  '신연진',
  '신예리',
  '아트만두',
  '양운철',
  '예미킴',
  '오아',
  '윤겸',
  '이광수',
  '이유지',
  '이인철',
  '이재정',
  '이지은',
  '이현정',
  '이혜선',
  '이홍원',
  '정금희',
  '정미정',
  '정연수',
  '조신욱',
  '칡뫼 김구',
  '홍진희',
  '김태균',
  '장천 김성태',
  '이채원',
  '한미영',
  '이문형',
  '천지수',
  '김정원',
];

const BIO_EN_ONLY = ['최재란'];

function quote(s: string): string {
  // PostgreSQL dollar-quoted string $tag$ ... $tag$ — safe for any content (escapes 불필요)
  const tag = 'PROFILE';
  const open = `$${tag}$`;
  if (s.includes(open)) {
    throw new Error(`profile contains delimiter conflict for tag ${tag}`);
  }
  return `${open}${s}${open}`;
}

const lines: string[] = [];
lines.push('-- ARTIST_DATA → Supabase artists.bio / bio_en 동기화');
lines.push('-- 생성: scripts/dump-artist-profiles.ts');
lines.push('BEGIN;');

for (const name of TARGETS) {
  const data = ARTIST_DATA[name];
  if (!data) {
    lines.push(`-- WARN: ${name} not found in ARTIST_DATA`);
    continue;
  }
  const bio = data.profile?.trim();
  const bioEn = data.profile_en?.trim();
  if (!bio || !bioEn) {
    lines.push(`-- WARN: ${name} profile/profile_en empty (bio=${!!bio} bioEn=${!!bioEn})`);
    continue;
  }
  lines.push(
    `UPDATE artists SET bio = ${quote(bio)}, bio_en = ${quote(bioEn)}, updated_at = now() WHERE name_ko = ${quote(name)};`
  );
}

for (const name of BIO_EN_ONLY) {
  const data = ARTIST_DATA[name];
  if (!data) continue;
  const bioEn = data.profile_en?.trim();
  if (!bioEn) continue;
  lines.push(
    `UPDATE artists SET bio_en = ${quote(bioEn)}, updated_at = now() WHERE name_ko = ${quote(name)};`
  );
}

lines.push('COMMIT;');
console.log(lines.join('\n'));
