-- supabase/migrations/20260702160000_newsletters.sql
-- 월간 뉴스레터: 블록 JSONB 콘텐츠 + 발송 수명주기. 발송 자체는 email_broadcasts 파이프라인 재사용
-- (email_broadcasts.newsletter_id 역참조 1:N — 채널별 1 broadcast).
CREATE TABLE IF NOT EXISTS public.newsletters (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_no          int         NOT NULL UNIQUE,
  slug              text        NOT NULL UNIQUE,
  title             text        NOT NULL DEFAULT '',
  preheader         text        NOT NULL DEFAULT '',
  blocks            jsonb       NOT NULL DEFAULT '[]',
  status            text        NOT NULL DEFAULT 'draft',
  audience_channels text[]      NOT NULL DEFAULT '{customer}',
  scheduled_at      timestamptz,
  sent_at           timestamptz,
  is_advertisement  boolean     NOT NULL DEFAULT true,
  created_by        uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT newsletters_status_check
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent')),
  CONSTRAINT newsletters_slug_check CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$')
);

ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;

-- 공개 웹 아카이브는 service role(SSG/ISR)로 조회하므로 anon 정책 불필요 — admin/service만.
CREATE POLICY "Admin full access on newsletters"
  ON public.newsletters FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on newsletters"
  ON public.newsletters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- 예약 도래분 스캔용 부분 인덱스
CREATE INDEX IF NOT EXISTS idx_newsletters_scheduled
  ON public.newsletters (scheduled_at)
  WHERE status = 'scheduled';

-- 발송 연결: 뉴스레터 1 : 채널별 broadcast N
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS newsletter_id uuid REFERENCES public.newsletters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_broadcasts_newsletter
  ON public.email_broadcasts (newsletter_id)
  WHERE newsletter_id IS NOT NULL;
