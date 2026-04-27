-- ============================================================
-- Migration: 오윤 구의동 벽화 시민 청원 — 서명 테이블 + 카운트 뷰
-- PRD §10.4 기준. 자체 폼 + Supabase 백엔드 + 실시간 카운터.
--
-- 포함 객체
--   - extension: pgcrypto (gen_random_uuid, digest)
--   - table:    public.petitions
--   - table:    public.petition_signatures
--   - view:     public.petition_counts (anon SELECT 허용 — 집계만)
--   - function: public.hash_email(text, text) / hash_ip(text, text)
--   - function: public.sign_petition(jsonb)  — Server Action에서 호출
--   - RLS: anon 직접 INSERT 차단(서버 함수 경유), admin SELECT
--   - seed:  'oh-yoon' 청원 1건
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ────────────────────────────────────────────────────────────
-- petitions: 청원 정의 (확장성 위해 분리)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.petitions (
  slug         text PRIMARY KEY,
  title        text NOT NULL,
  goal         integer NOT NULL DEFAULT 10000 CHECK (goal > 0),
  deadline_at  timestamptz NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  closed_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Petitions public read" ON public.petitions;
CREATE POLICY "Petitions public read" ON public.petitions
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Petitions admin write" ON public.petitions;
CREATE POLICY "Petitions admin write" ON public.petitions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  );

-- ────────────────────────────────────────────────────────────
-- petition_signatures: 서명 레코드
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.petition_signatures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petition_slug   text NOT NULL REFERENCES public.petitions(slug) ON DELETE RESTRICT,

  full_name       text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 1 AND 100),
  email           text NOT NULL,                       -- 평문 (RLS·at-rest 암호화 의존)
  email_hash      text NOT NULL,                       -- sha256(salt || lower(email)) — 중복 방지

  region_top      text NOT NULL CHECK (region_top IN (
    '서울','부산','대구','인천','광주','대전','울산','세종',
    '경기','강원','충북','충남','전북','전남','경북','경남','제주',
    '해외'
  )),
  region_sub      text,                                -- '광진구' / '성남시 분당구' / null (해외·세종 등)

  is_committee    boolean NOT NULL DEFAULT false,
  message         text CHECK (message IS NULL OR char_length(message) <= 500),
  message_public  boolean NOT NULL DEFAULT false,      -- 공개 동의 (메시지가 있을 때만 의미)

  is_masked       boolean NOT NULL DEFAULT false,      -- 운영자 마스킹 처리
  masked_at       timestamptz,
  masked_by       uuid REFERENCES auth.users(id),

  agreed_petition boolean NOT NULL CHECK (agreed_petition = true),
  agreed_privacy  boolean NOT NULL CHECK (agreed_privacy = true),
  agreed_overseas boolean NOT NULL CHECK (agreed_overseas = true),

  user_agent      text,
  ip_hash         text,                                -- sha256(salt || ip)

  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT petition_signatures_unique_email
    UNIQUE (petition_slug, email_hash)
);

CREATE INDEX IF NOT EXISTS idx_petition_signatures_slug_created
  ON public.petition_signatures (petition_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_petition_signatures_slug_region
  ON public.petition_signatures (petition_slug, region_top);

CREATE INDEX IF NOT EXISTS idx_petition_signatures_committee
  ON public.petition_signatures (petition_slug, is_committee)
  WHERE is_committee = true;

CREATE INDEX IF NOT EXISTS idx_petition_signatures_message_review
  ON public.petition_signatures (petition_slug, created_at DESC)
  WHERE message IS NOT NULL AND is_masked = false;

ALTER TABLE public.petition_signatures ENABLE ROW LEVEL SECURITY;

-- 익명·인증 사용자는 직접 INSERT/SELECT/UPDATE/DELETE 모두 차단.
-- 서명은 service_role로 실행되는 public.sign_petition() 함수만 허용.
DROP POLICY IF EXISTS "Signatures admin read" ON public.petition_signatures;
CREATE POLICY "Signatures admin read" ON public.petition_signatures
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Signatures admin update" ON public.petition_signatures;
CREATE POLICY "Signatures admin update" ON public.petition_signatures
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  );

REVOKE ALL ON public.petition_signatures FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.petition_signatures TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.petition_signatures TO service_role;

-- ────────────────────────────────────────────────────────────
-- petition_counts: 익명에게 노출 가능한 집계 뷰 (PII 없음)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.petition_counts
WITH (security_invoker = false) AS
SELECT
  p.slug                                                       AS petition_slug,
  p.title,
  p.goal,
  p.deadline_at,
  p.is_active,
  COALESCE(COUNT(s.id), 0)::integer                            AS total,
  COALESCE(COUNT(*) FILTER (WHERE s.is_committee), 0)::integer AS committee_total,
  COALESCE(COUNT(DISTINCT s.region_top), 0)::integer           AS region_top_count,
  COALESCE(
    COUNT(*) FILTER (WHERE s.created_at > now() - interval '24 hours'),
    0
  )::integer                                                   AS recent_24h
FROM public.petitions p
LEFT JOIN public.petition_signatures s
  ON s.petition_slug = p.slug AND s.is_masked = false
GROUP BY p.slug, p.title, p.goal, p.deadline_at, p.is_active;

GRANT SELECT ON public.petition_counts TO anon, authenticated, service_role;

-- ────────────────────────────────────────────────────────────
-- 해시 헬퍼 (서버 함수 내부에서만 사용)
-- ────────────────────────────────────────────────────────────
-- pgcrypto는 Supabase에서 'extensions' 스키마에 설치되므로 search_path에 포함.
-- digest() 호출도 명시적 스키마로 안전하게 이중 보호.
CREATE OR REPLACE FUNCTION public.hash_email(p_email text, p_salt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT encode(
    extensions.digest(p_salt || lower(btrim(p_email)), 'sha256'),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.hash_ip(p_ip text, p_salt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  SELECT CASE
    WHEN p_ip IS NULL OR btrim(p_ip) = '' THEN NULL
    ELSE encode(extensions.digest(p_salt || p_ip, 'sha256'), 'hex')
  END;
$$;

REVOKE ALL ON FUNCTION public.hash_email(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.hash_ip(text, text)    FROM anon, authenticated;

-- ────────────────────────────────────────────────────────────
-- sign_petition: 서명 처리 RPC
--   - service_role 호출 전제 (Server Action에서 service_role 클라이언트로)
--   - hCaptcha 검증·rate-limit·이메일 발송은 호출자가 책임
--   - 본 함수는: 청원 활성 검사 + INSERT + 중복 분기
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sign_petition(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_role          text;
  v_slug          text;
  v_email         text;
  v_email_hash    text;
  v_ip_hash       text;
  v_email_salt    text;
  v_ip_salt       text;
  v_signature_id  uuid;
  v_petition      public.petitions%ROWTYPE;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'PETITION_SIGN_FORBIDDEN';
  END IF;

  v_slug       := p_payload->>'petition_slug';
  v_email      := p_payload->>'email';
  v_email_salt := current_setting('app.petition_email_salt', true);
  v_ip_salt    := current_setting('app.petition_ip_salt', true);

  IF v_email_salt IS NULL OR v_email_salt = '' THEN
    RAISE EXCEPTION 'PETITION_EMAIL_SALT_NOT_SET';
  END IF;

  -- 청원 활성 여부 확인
  SELECT * INTO v_petition FROM public.petitions WHERE slug = v_slug;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PETITION_NOT_FOUND';
  END IF;
  IF NOT v_petition.is_active OR v_petition.deadline_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'code', 'PETITION_CLOSED');
  END IF;

  v_email_hash := public.hash_email(v_email, v_email_salt);
  v_ip_hash    := public.hash_ip(p_payload->>'ip', COALESCE(v_ip_salt, v_email_salt));

  BEGIN
    INSERT INTO public.petition_signatures (
      petition_slug, full_name, email, email_hash,
      region_top, region_sub, is_committee,
      message, message_public,
      agreed_petition, agreed_privacy, agreed_overseas,
      user_agent, ip_hash
    ) VALUES (
      v_slug,
      btrim(p_payload->>'full_name'),
      lower(btrim(v_email)),
      v_email_hash,
      p_payload->>'region_top',
      NULLIF(btrim(p_payload->>'region_sub'), ''),
      COALESCE((p_payload->>'is_committee')::boolean, false),
      NULLIF(btrim(p_payload->>'message'), ''),
      COALESCE((p_payload->>'message_public')::boolean, false),
      (p_payload->>'agreed_petition')::boolean,
      (p_payload->>'agreed_privacy')::boolean,
      (p_payload->>'agreed_overseas')::boolean,
      p_payload->>'user_agent',
      v_ip_hash
    )
    RETURNING id INTO v_signature_id;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('ok', false, 'code', 'DUPLICATE_EMAIL');
  END;

  RETURN jsonb_build_object('ok', true, 'id', v_signature_id);
END;
$$;

REVOKE ALL ON FUNCTION public.sign_petition(jsonb) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.sign_petition(jsonb) TO service_role;

-- ────────────────────────────────────────────────────────────
-- updated_at 트리거
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_petitions_updated_at ON public.petitions;
CREATE TRIGGER trg_petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- seed: 'oh-yoon' 청원
-- ────────────────────────────────────────────────────────────
INSERT INTO public.petitions (slug, title, goal, deadline_at, is_active)
VALUES (
  'oh-yoon',
  '오윤 구의동 벽화 시민 청원',
  10000,
  '2026-05-10 23:59:59+09',
  true
)
ON CONFLICT (slug) DO NOTHING;
