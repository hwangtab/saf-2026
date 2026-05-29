-- Migration: stories.body_en의 deprecated 뭄바이 supabase URL을 Seoul URL로 일괄 치환.
--
-- 배경: 2026-05-22 Supabase 프로젝트가 뭄바이(vqejnuntjnxzpgwfndtv) → 서울(khtunrybrzntlnowlahb)
-- 이전 완료됐으나 stories.body_en (영문 본문) 171건이 작성 당시의 뭄바이 URL을 잔존 보유.
-- body(한국어)는 이미 Seoul URL이고 path 구조도 동일하므로 host 부분만 단순 치환으로 안전.
--
-- next.config.js의 remotePatterns가 뭄바이 host도 한시 허용 중이지만 장기적으로 동일 도메인
-- 통일이 cache 효율·SEO·security 측면에서 옳음. 치환 후 next.config 정리 가능.
--
-- 검증 (dry-run 결과):
--   affected_rows: 171
--   rows_with_mumbai_after: 0
--   rows_with_seoul_after: 171

UPDATE stories
SET body_en = REPLACE(body_en, 'vqejnuntjnxzpgwfndtv.supabase.co', 'khtunrybrzntlnowlahb.supabase.co')
WHERE body_en LIKE '%vqejnuntjnxzpgwfndtv%';
