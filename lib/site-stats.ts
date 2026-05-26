// 메타·SEO 카피·i18n 메시지·JSON-LD 스키마에 들어가는 작품/작가 수의 단일 출처.
// 빌드 전 scripts/sync-site-stats.js 가 Supabase DB에서 자동 갱신 (prebuild 훅).
// 수동 수정 불필요 — 갱신 방법: npm run build 또는 node scripts/sync-site-stats.js
// 최종 갱신: 2026-05-26 (artworks.is_hidden=false 기준 404건, 작가 113명)
export const ARTWORK_COUNT = 404;
// 노출 작품이 있는 작가 수 (is_hidden=false 작품 보유 기준).
// 최종 갱신: 2026-05-26
export const ARTIST_COUNT = 113;

// 예술인 상호부조 대출 누적 건수 (한국스마트협동조합 운영 데이터, 수기 갱신).
// 운영 보고서·SEO 카피·JSON-LD 답변에서 반복 사용되는 핵심 수치.
// 갱신 시점: 2025-09 누적 — 수치가 바뀌면 이 한 줄만 수정.
export const LOAN_COUNT = 354;
