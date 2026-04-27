-- ============================================================
-- Migration: 청원 운영자 감사 로그
-- PRD §10.7.9. 운영자의 모든 변경 행위(마스킹·복원·삭제·CSV·메일·강제마감)를
-- 추적해 책임을 분명히 한다.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.petition_audit_log (
  id           bigserial PRIMARY KEY,
  petition_slug text NOT NULL,
  actor_id     uuid REFERENCES auth.users(id),
  action       text NOT NULL CHECK (action IN (
    'mask_message',
    'unmask_message',
    'delete_message',
    'csv_export_full',
    'csv_export_masked',
    'csv_export_committee',
    'mail_send_milestone',
    'mail_send_d1',
    'mail_send_result',
    'mail_send_committee',
    'force_close_campaign',
    'reopen_campaign',
    'manual_purge_pii'
  )),
  target_type  text CHECK (target_type IN ('signature', 'message', 'campaign', 'batch')),
  target_id    uuid,
  details      jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_petition_audit_log_slug_created
  ON public.petition_audit_log (petition_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_petition_audit_log_actor
  ON public.petition_audit_log (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_petition_audit_log_action
  ON public.petition_audit_log (action, created_at DESC);

ALTER TABLE public.petition_audit_log ENABLE ROW LEVEL SECURITY;

-- admin SELECT만. 누구도 직접 INSERT/UPDATE/DELETE 못 함 (service_role만).
DROP POLICY IF EXISTS "Audit admin read" ON public.petition_audit_log;
CREATE POLICY "Audit admin read" ON public.petition_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin')
  );

REVOKE ALL ON public.petition_audit_log FROM anon, authenticated;
GRANT SELECT ON public.petition_audit_log TO authenticated;
GRANT SELECT, INSERT ON public.petition_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.petition_audit_log_id_seq TO service_role;

-- ────────────────────────────────────────────────────────────
-- 감사 로그 기록 헬퍼 RPC
--   호출 예: select public.log_petition_audit('oh-yoon', 'mask_message',
--             'message', '...uuid...', '{"reason":"abuse"}'::jsonb);
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_petition_audit(
  p_slug        text,
  p_action      text,
  p_target_type text,
  p_target_id   uuid,
  p_details     jsonb DEFAULT '{}'::jsonb,
  p_actor_id    uuid DEFAULT NULL,
  p_ip_hash     text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_id   bigint;
BEGIN
  v_role := current_setting('request.jwt.claim.role', true);
  IF v_role IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUDIT_LOG_FORBIDDEN';
  END IF;

  INSERT INTO public.petition_audit_log (
    petition_slug, actor_id, action, target_type, target_id, details, ip_hash
  ) VALUES (
    p_slug,
    COALESCE(p_actor_id, auth.uid()),
    p_action,
    p_target_type,
    p_target_id,
    COALESCE(p_details, '{}'::jsonb),
    p_ip_hash
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_petition_audit(
  text, text, text, uuid, jsonb, uuid, text
) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.log_petition_audit(
  text, text, text, uuid, jsonb, uuid, text
) TO service_role;

-- ────────────────────────────────────────────────────────────
-- petition_signatures 마스킹 변경 자동 감사 로그 트리거
-- ────────────────────────────────────────────────────────────
-- BEFORE 트리거: is_masked 변경 시 masked_at·masked_by 자동 채움
CREATE OR REPLACE FUNCTION public.fill_petition_mask_metadata()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_masked IS DISTINCT FROM OLD.is_masked THEN
    IF NEW.is_masked THEN
      NEW.masked_at := now();
      NEW.masked_by := auth.uid();
    ELSE
      NEW.masked_at := NULL;
      NEW.masked_by := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_petition_mask_metadata ON public.petition_signatures;
CREATE TRIGGER trg_fill_petition_mask_metadata
  BEFORE UPDATE OF is_masked ON public.petition_signatures
  FOR EACH ROW EXECUTE FUNCTION public.fill_petition_mask_metadata();

-- AFTER 트리거: is_masked 변경 감사 로그 INSERT
CREATE OR REPLACE FUNCTION public.audit_petition_message_mask()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_masked IS DISTINCT FROM OLD.is_masked THEN
    INSERT INTO public.petition_audit_log (
      petition_slug, actor_id, action, target_type, target_id, details
    ) VALUES (
      NEW.petition_slug,
      auth.uid(),
      CASE WHEN NEW.is_masked THEN 'mask_message' ELSE 'unmask_message' END,
      'message',
      NEW.id,
      jsonb_build_object(
        'before_masked', OLD.is_masked,
        'after_masked',  NEW.is_masked,
        'message_excerpt', LEFT(COALESCE(OLD.message, ''), 80)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_petition_message_mask ON public.petition_signatures;
CREATE TRIGGER trg_audit_petition_message_mask
  AFTER UPDATE OF is_masked ON public.petition_signatures
  FOR EACH ROW EXECUTE FUNCTION public.audit_petition_message_mask();
