-- ============================================================
-- Migration: 오윤 청원 마감 제한 해제
--
-- 배경: 마감일 표기와 마감 자체를 페이지에서 모두 제거하는 운영 결정.
-- petition_signatures.deadline_at 컬럼이 NOT NULL이라 NULL로 둘 수
-- 없고, sign_petition RPC와 petition_auto_close cron 모두
-- `deadline_at <= now()` 기준으로 차단하므로 컬럼을 충분히 먼 미래
-- (2099-12-31)로 박아 사실상 무기한 운영으로 전환.
--
-- 페이지에서는 카운트다운·마감 라벨·OG 메타의 날짜 표기를 모두 제거
-- 했으므로 DB 값은 운영자만 인지하는 내부 가드 역할.
--
-- 멱등: closed_at이 null인 경우에만 UPDATE. 수동으로 closed 상태인
-- 청원은 reopen 절차가 따로 있어야 하므로 손대지 않음.
-- ============================================================

UPDATE public.petitions
   SET deadline_at = '2099-12-31 23:59:59+09'::timestamptz
 WHERE slug = 'oh-yoon'
   AND closed_at IS NULL;
