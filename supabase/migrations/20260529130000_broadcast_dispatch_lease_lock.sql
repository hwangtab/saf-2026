-- Bug B(크론 중복 발송) 차단: broadcast-dispatch는 매분 cron + maxDuration 300s.
-- 대량 발송(11,508건 ≈ 460s)은 한 invocation에서 못 끝나 다음 분 run이 같은 pending을
-- 다시 읽어 중복 발송. 브로드캐스트 단위 리스 락으로 동시 처리를 직렬화하고
-- 락 만료 기반으로 다음 run이 안전하게 이어받게(resume) 한다.

ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS dispatch_locked_until timestamptz,
  ADD COLUMN IF NOT EXISTS dispatch_lock_token uuid;

-- 락 획득: queued이거나 (sending이며 리스 만료)인 경우에만 claim.
-- 새 토큰 반환(성공), 다른 run이 유효 리스를 쥐고 있으면 NULL.
CREATE OR REPLACE FUNCTION public.claim_broadcast_dispatch(
  p_broadcast_id uuid,
  p_lease_seconds int DEFAULT 120
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
BEGIN
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'p_lease_seconds must be positive, got %', p_lease_seconds;
  END IF;
  UPDATE email_broadcasts
  SET status = 'sending',
      dispatch_locked_until = now() + make_interval(secs => p_lease_seconds),
      dispatch_lock_token = v_token,
      queued_at = COALESCE(queued_at, now())
  WHERE id = p_broadcast_id
    AND status IN ('queued', 'sending')
    AND (dispatch_locked_until IS NULL OR dispatch_locked_until < now())
  RETURNING dispatch_lock_token INTO v_claimed;
  RETURN v_claimed;
END;
$$;

-- 리스 갱신: 토큰 일치할 때만(=현재 보유자) 만료시각 연장. 빼앗겼으면 false.
CREATE OR REPLACE FUNCTION public.renew_broadcast_dispatch(
  p_broadcast_id uuid,
  p_token uuid,
  p_lease_seconds int DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'p_lease_seconds must be positive, got %', p_lease_seconds;
  END IF;
  UPDATE email_broadcasts
  SET dispatch_locked_until = now() + make_interval(secs => p_lease_seconds)
  WHERE id = p_broadcast_id AND dispatch_lock_token = p_token AND status = 'sending'
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_broadcast_dispatch(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_broadcast_dispatch(uuid, uuid, int) TO service_role;
