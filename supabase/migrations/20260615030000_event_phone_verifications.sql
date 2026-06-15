-- 추도식 본인 환불용 휴대폰 인증번호(문자 OTP) 저장.
-- 6자리 코드를 서버에 저장해 오프라인 무차별 대입을 차단(클라이언트 토큰에 코드 보관 금지).
-- service_role 전용(정책 없음 = 기본 deny). 만료/소비/시도횟수로 보호.

CREATE TABLE IF NOT EXISTS public.event_phone_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug  text NOT NULL,
  phone       text NOT NULL,
  code        text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed    boolean NOT NULL DEFAULT false,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_phone_verif
  ON public.event_phone_verifications (event_slug, phone, created_at DESC);

ALTER TABLE public.event_phone_verifications ENABLE ROW LEVEL SECURITY;
