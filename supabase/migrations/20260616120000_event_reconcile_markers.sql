-- 이벤트 결제 reconcile 안전망 — 안티스팸 마커.
--
-- reconcile-event-registrations 크론이 '캡처됐는데 미확정'인 등록을 자동 복구(확정/환불)할 때,
-- 영구 환불 실패 등으로 종결되지 못한 행이 매 사이클 재알림되는 것을 막기 위한 마커.
--   - reconciled_at: 크론이 마지막으로 처리(확정/환불/알림)한 시각.
--   - reconcile_attempts: 누적 시도 횟수. N회 초과 시 크론이 조회에서 제외(폭주 차단) + admin 수동.
-- 성공 복구는 status 전이(confirmed/cancelled)로 조회에서 빠지므로 이 마커는 실패 tail 전용.

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconcile_attempts integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.event_registrations.reconciled_at IS
  'reconcile 크론이 마지막으로 처리한 시각. 영구 stuck 행의 알림 1회 가드.';
COMMENT ON COLUMN public.event_registrations.reconcile_attempts IS
  'reconcile 크론 누적 시도 횟수. 임계치 초과 시 자동 처리 중단(admin 수동 전환).';
