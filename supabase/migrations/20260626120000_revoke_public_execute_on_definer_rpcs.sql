-- SECURITY DEFINER RPC들의 PUBLIC EXECUTE 권한 회귀 일괄 정정
-- 사유: 코드베이스 감사(2026-06-26)에서 아래 5개 함수가 anon/PUBLIC에 EXECUTE 노출된 것을 적발.
--   1) get_purchase_click_summary / get_top_purchase_clicked_artworks
--      — 20260511094946에서 DROP+CREATE로 재정의되며 20260507055915이 적용했던
--        REVOKE FROM PUBLIC이 초기화됨(DROP+CREATE는 ACL을 리셋). proacl=null 확인.
--   2) cancel_stale_pending_orders_for_buyer_artworks
--      — 20260616130000이 anon/authenticated만 REVOKE하고 PUBLIC pseudo-role을 누락.
--        주문을 cancelled로 UPDATE하는 변경 함수라 anon griefing 벡터.
--   3) get_web_vitals_regressions / get_web_vitals_regression_count
--      — REVOKE FROM PUBLIC 없이 authenticated GRANT만 존재. 선두 =X(PUBLIC) 상속으로 anon 호출 가능.
-- 모든 함수의 정상 caller는 service_role(admin server action)이므로 기능 영향 없음.
-- 교훈: SECURITY DEFINER 함수의 권한은 항상 `FROM PUBLIC`을 포함해 REVOKE할 것. 단순히
--       anon/authenticated만 REVOKE하면 PUBLIC 상속분이 남는다. DROP+CREATE 재정의 시 ACL 재설정 필수.

-- 1) purchase_click 분석 RPC
REVOKE ALL ON FUNCTION public.get_purchase_click_summary(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_purchase_click_summary(timestamptz)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_top_purchase_clicked_artworks(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_purchase_clicked_artworks(timestamptz, int)
  TO service_role;

-- 2) 결제 대기 주문 취소(변경 함수) — griefing 차단
REVOKE ALL ON FUNCTION public.cancel_stale_pending_orders_for_buyer_artworks(text, uuid[], timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_stale_pending_orders_for_buyer_artworks(text, uuid[], timestamptz)
  TO service_role;

-- 3) web vitals 회귀 분석 RPC
REVOKE ALL ON FUNCTION public.get_web_vitals_regressions(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_regressions(timestamptz, int)
  TO service_role;

REVOKE ALL ON FUNCTION public.get_web_vitals_regression_count(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_regression_count(timestamptz, int)
  TO service_role;
