-- ============================================================
-- Migration: 오윤 청원 마감일 1주 연장 (5/25 → 6/1 23:59 KST)
--
-- 배경: 2026-05-25 마감 당일 운영 결정으로 1주 연장. 청원 활동
-- 모멘텀 유지 + 추가 서명 수집 + 마감일 자동 close cron이 25일
-- 24시 이후 첫 hourly run에 닫아버리지 않도록 deadline_at 자체를
-- 미래로 이동.
--
-- 차단 로직:
--   - sign_petition RPC: IF NOT v_petition.is_active OR
--                        v_petition.deadline_at <= now()
--                        THEN PETITION_CLOSED
--   - petition_auto_close cron (매시간): WHERE is_active = true
--                                        AND deadline_at <= now()
--
-- 두 검사 모두 petitions.deadline_at 컬럼이 결정자.
-- 코드 상수 PETITION_OH_YOON_DEADLINE_ISO는 페이지 표시(카운트다운,
-- 헤로, OG 이미지, 메일 템플릿)에 사용 — 같은 커밋에서 6/1로 동기화.
--
-- 멱등: closed_at이 null인 경우에만 UPDATE. 이미 closed_at이 박힌
-- (= 청원 종료된) 상태라면 manual reopen이 필요하므로 손대지 않음.
-- ============================================================

UPDATE public.petitions
   SET deadline_at = '2026-06-01 23:59:59+09'::timestamptz
 WHERE slug = 'oh-yoon'
   AND closed_at IS NULL;
