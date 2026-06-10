-- supabase/migrations/20260610100000_profiles_add_phone.sql
-- 마케팅/회원 브로드캐스트 SMS 대상 추출용 전화번호 컬럼.
-- 수집 지점: 회원가입·마이페이지(별도 태스크). 정규화는 발송 시 normalizeKoreanMobile에 위임.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
