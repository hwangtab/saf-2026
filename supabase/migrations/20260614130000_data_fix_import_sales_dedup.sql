-- ============================================================================
-- 2026-06-14 import 매출 중복 정정 (감사 기록용 / audit record)
--
-- ⚠️ 이 마이그레이션은 이미 production(khtunrybrzntlnowlahb)에 MCP execute_sql 로
--    직접 적용 완료된 상태입니다. 이 파일은 git 이력 · 감사 보존 목적이며,
--    모든 문장이 idempotent(재실행 시 0건 매칭)하게 작성되어
--    `supabase db push` 시에도 데이터를 추가로 변경하지 않습니다.
--    (void 문은 `voided_at IS NULL`, 작품 숨김 문은 `is_hidden = false` 로 가드)
--
-- 배경:
--   cafe24/manual CSV import(특히 2026-06-01 manual_csv 배치)가 동일 작품의 판매를
--   중복 작품 레코드에 재입력하거나 같은 레코드에 2회 등록 → unique 작품에 active
--   판매가 2건씩 잡혀 작가 매출 · 오프라인 정산액이 과대 계상됨. 결제(toss) 흐름과는
--   무관(전부 order_id IS NULL). 직전 전시배치 정정(20260614120000)과 다른 import 배치.
--
-- 판별 기준:
--   · unique 작품은 1점만 판매 가능 → 같은 작품 active 판매 2건 중 1건은 중복.
--   · cafe24 실거래(external_order_id/legacy_csv)는 신뢰하여 보존, manual_csv 재입력분 무효화.
--   · 2026-06-01 manual_csv 배치가 두 "노무현" 레코드를 교차 오염(각 구매자를 상대
--     작품에 복사)한 패턴 확인 → 양쪽 배치 복사본 무효화, 실거래(cafe24·수동 3/24) 보존.
--
-- 본 정정 결과:
--   · 중복 판매 무효화 4건 = 4,100,000원
--       박재동 -3,000,000 (노무현 이승주·이승미 교차오염)
--       윤겸   -1,000,000 (꿈의 안식처: 1M 작품 판매가 2M 작품에 중복)
--       김정원   -100,000 (손 모은 사람: 유수형 cafe24 판매 중복 레코드)
--   · 구매 가능 중복 작품 레코드 1건 숨김 (김현철 "산": 이미 팔린 unique의
--     available 중복 레코드 → 오구매 차단)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 중복 판매 무효화 (4건)
-- ----------------------------------------------------------------------------

-- 윤겸 "꿈의 안식처 Dream heaven": 1M 작품(3d606533)의 명성옥 판매가 2M 작품(2201db20)에 중복.
UPDATE public.artwork_sales
SET voided_at = now(),
    void_reason = 'import 중복 정리 2026-06: 1M 작품(3d606533)의 명성옥 판매가 2M 작품에 중복 입력됨'
WHERE voided_at IS NULL
  AND id = '9f80fa0b-c515-4293-a614-ba9f9ac23915';

-- 박재동 "노무현": 이승주 cafe24 실판매(원본작품 0e60e54b)가 중복작품 a8cca196에 재입력.
UPDATE public.artwork_sales
SET voided_at = now(),
    void_reason = 'import 중복 정리 2026-06: 이승주 cafe24 판매(원본작품 0e60e54b)가 중복작품 a8cca196에 재입력됨'
WHERE voided_at IS NULL
  AND id = '2ce386c7-c215-44c2-b58d-00ebfbbd38aa';

-- 박재동 "노무현": 2026-06-01 manual_csv 배치가 이승미의 a8cca196 판매를 원본작품 0e60e54b에 교차 복사.
UPDATE public.artwork_sales
SET voided_at = now(),
    void_reason = 'import 중복 정리 2026-06: 2026-06-01 manual_csv 배치가 이승미의 a8cca196 판매를 원본작품 0e60e54b에 교차 복사함(이 작품의 실판매는 이승주 cafe24)'
WHERE voided_at IS NULL
  AND id = '1834f11f-4ce9-4e62-8c60-b5c663c75720';

-- 김정원 "손 모은 사람"(open): 유수형 cafe24 판매가 중복 작품레코드(64f35062)에 한 번 더 입력 (60043ccd 보존).
UPDATE public.artwork_sales
SET voided_at = now(),
    void_reason = 'import 중복 정리 2026-06: 유수형 cafe24 판매가 중복 작품레코드(64f35062)에 한 번 더 입력됨 (60043ccd의 동일 판매 유지)'
WHERE voided_at IS NULL
  AND id = '611bd0be-91d7-4f42-9368-f4ce349d82a9';

-- ----------------------------------------------------------------------------
-- 2) 구매 가능 중복 작품 레코드 숨김 (1건)
--    김현철 "산": 동일 작가·제목의 sold unique(58dcc4b2)와 별개로 존재하는
--    available 중복 레코드 → 갤러리에서 오구매 가능하므로 숨김.
-- ----------------------------------------------------------------------------
UPDATE public.artworks
SET is_hidden = true,
    updated_at = now()
WHERE is_hidden = false
  AND status = 'available'
  AND id = 'bd235ad6-58ae-499b-af0e-548531a99930';
