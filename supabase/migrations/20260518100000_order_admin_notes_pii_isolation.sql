-- order_admin_notes: 관리자 에스컬레이션 메모를 orders 테이블에서 분리.
-- orders에 escalation_note가 있으면 구매자 RLS("Buyers can view own orders")로도 조회 가능 →
-- 운영자 내부 메모가 구매자에게 노출될 수 있어 별도 admin-only 테이블로 격리.
-- escalated_at 컬럼은 orders에 유지 (SLA·에스컬레이션 카운트 쿼리가 해당 컬럼 사용).

CREATE TABLE IF NOT EXISTS order_admin_notes (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  note     text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage order_admin_notes"
  ON order_admin_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'::user_role
    )
  );

-- service_role bypasses RLS but still needs object-level grant
GRANT SELECT, INSERT, UPDATE, DELETE ON order_admin_notes TO service_role;

-- Migrate existing data (currently 0 rows; safety net for future re-runs)
INSERT INTO order_admin_notes (order_id, note)
SELECT id, escalation_note
FROM orders
WHERE escalation_note IS NOT NULL
ON CONFLICT (order_id) DO UPDATE SET note = EXCLUDED.note, updated_at = now();

-- Remove escalation_note from orders (PII isolation complete)
ALTER TABLE orders DROP COLUMN IF EXISTS escalation_note;
