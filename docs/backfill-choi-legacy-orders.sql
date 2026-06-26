-- ⚠️ 이미 적용 완료(2026-06-26). 이 파일은 적용 기록용 — 라이브에 SAF-20260123-LEGACY01·
--    SAF-20260211-LEGACY02 존재 확인됨. 아래 ON CONFLICT 가드로 재실행해도 무해(멱등).
--
-- 일회성 데이터 백필: IB Choi(최인범) 과거 cafe24/수기 판매 2건을 orders에 사후 입력 + 계정 연결
-- 사유: 마이페이지 구매내역은 새 토스 orders 테이블 기반인데, cafe24/수기 시절 구매는
--       마이그레이션되지 않아 로그인해도 표시 데이터가 없었음. 본인 문의로 백필.
-- 계정: adol.choi@gmail.com (7b262c18-616d-482a-936c-313548c0fec6)
-- 출처: docs/판매목록.csv (최인범 010-2744-2078, 2건)
-- 비고: 매출·sold 상태는 artwork_sales에서 집계되므로 orders 직접 INSERT는 매출 중복 계상 없음.

WITH new_orders AS (
  INSERT INTO public.orders (
    order_no, artwork_id, quantity,
    buyer_name, buyer_email, buyer_phone, buyer_user_id,
    shipping_name, shipping_phone, shipping_address, shipping_postal_code,
    item_amount, shipping_amount, total_amount,
    status, paid_at, created_at, updated_at,
    note, metadata
  )
  VALUES
  (
    'SAF-20260123-LEGACY01', 'c4c8af72-33fa-44b1-a7e1-a41d872e226f', 1,
    '최인범', 'adol.choi@gmail.com', '01027442078', '7b262c18-616d-482a-936c-313548c0fec6',
    '최인범', '01027442078', '경기 안산시 상록구 건건6길 11-2 404', '15521',
    1500000, 0, 1500000,
    'delivered', '2026-01-23 12:00:00+09', '2026-01-23 12:00:00+09', now(),
    '[백필] cafe24/수기 시절 온라인 구매. 출처: docs/판매목록.csv. 본인 문의(adol.choi@gmail.com)로 마이페이지 표시 위해 사후 입력.',
    '{"backfilled": true, "source": "cafe24-legacy-sales-csv", "backfilled_at": "2026-06-26"}'::jsonb
  ),
  (
    'SAF-20260211-LEGACY02', '2201db20-454b-45b2-8913-3f42dcb5e3f3', 1,
    '최인범', 'adol.choi@gmail.com', '01027442078', '7b262c18-616d-482a-936c-313548c0fec6',
    '최인범', '01027442078', '경기 안산시 상록구 건건6길 11-2 404', '15521',
    2000000, 0, 2000000,
    'delivered', '2026-02-11 12:00:00+09', '2026-02-11 12:00:00+09', now(),
    '[백필] cafe24/수기 시절 온라인 구매. 출처: docs/판매목록.csv. 본인 문의(adol.choi@gmail.com)로 마이페이지 표시 위해 사후 입력.',
    '{"backfilled": true, "source": "cafe24-legacy-sales-csv", "backfilled_at": "2026-06-26"}'::jsonb
  )
  ON CONFLICT (order_no) DO NOTHING
  RETURNING id, order_no, artwork_id, total_amount
)
INSERT INTO public.order_items (order_id, artwork_id, quantity, unit_price)
SELECT id, artwork_id, 1, total_amount FROM new_orders
ON CONFLICT DO NOTHING;
