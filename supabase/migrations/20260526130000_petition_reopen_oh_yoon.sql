-- ============================================================
-- Migration: 오윤 청원 무기한 재개
--
-- 배경:
--   Supabase 서울 이전(2026-05-22) 이후, 5/25 "마감 제한 해제" 변경이
--   구 뭄바이 DB(vqejnuntjnxzpgwfndtv)에만 적용되고 라이브 서울 DB
--   (khtunrybrzntlnowlahb)에는 반영되지 않음.
--   2026-05-26 00:00 KST에 petition_auto_close cron이 만료 마감일을
--   감지해 청원을 닫음(is_active=false, closed_at 세팅).
--
--   기존 petition_remove_oh_yoon_deadline.sql은 `closed_at IS NULL`
--   가드가 있어 이미 닫힌 행에 효과 없음 → 재개 전용 마이그레이션 별도 작성.
--
-- 변경 내용:
--   - deadline_at: 2099-12-31 (사실상 무기한)
--   - is_active: true (재개)
--   - closed_at: NULL (cron 자동 닫힘 취소)
-- ============================================================

UPDATE public.petitions
   SET deadline_at = '2099-12-31 23:59:59+09'::timestamptz,
       is_active   = true,
       closed_at   = NULL
 WHERE slug = 'oh-yoon';
