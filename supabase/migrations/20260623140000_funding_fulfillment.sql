-- 리워드 발송 추적 컬럼 (admin 발송 관리).
ALTER TABLE public.funding_pledges
  ADD COLUMN IF NOT EXISTS fulfillment_status text NOT NULL DEFAULT 'none'
    CHECK (fulfillment_status IN ('none','preparing','shipped','delivered'));
ALTER TABLE public.funding_pledges ADD COLUMN IF NOT EXISTS tracking_company text;
ALTER TABLE public.funding_pledges ADD COLUMN IF NOT EXISTS tracking_number text;
