import { artworks } from '@/content/saf2026-artworks';

// 메타·SEO 카피·i18n 메시지에 들어가는 작품/작가 수의 단일 출처.
// content/saf2026-artworks.ts (DB sync + legacy batches)에서 빌드 타임에 도출.
// 숫자를 직접 박지 말고 반드시 이 상수를 거칠 것 — DB 변동 시 한 곳만 갱신됨.
export const ARTWORK_COUNT = artworks.length;
export const ARTIST_COUNT = new Set(artworks.map((a) => a.artist)).size;

// 예술인 상호부조 대출 누적 건수 (한국스마트협동조합 운영 데이터, 수기 갱신).
// 운영 보고서·SEO 카피·JSON-LD 답변에서 반복 사용되는 핵심 수치.
// 갱신 시점: 2025-09 누적 — 수치가 바뀌면 이 한 줄만 수정.
export const LOAN_COUNT = 354;
