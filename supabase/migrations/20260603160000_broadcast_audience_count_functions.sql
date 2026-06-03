-- ============================================================
-- 단체메일 수신자 수 미리보기용 count-only 함수
--
-- 목적: previewAudience가 전체 Recipient[]를 resolve()한 뒤 .length만 쓰던 낭비
--       (특히 청원 11k full-scan + 행별 hashEmail)을, 행 전송 없이 DB에서 정확한
--       수신자 수를 계산하는 함수로 대체한다.
--
-- 정확성: lib/email/audiences/*.ts 의 각 resolver 로직을 1:1로 미러링한다.
--   - 정규화·중복제거: lower(btrim(email)) DISTINCT
--   - suppression 차감: public.hash_email(email, p_salt) 가 email_suppressions.email_hash 와
--     동일(같은 salt) 하므로 anti-join 으로 차감 (resolver의 Set 차감과 등가)
--   - 6개월 = 정확히 180일 (resolver: Date.now() - 6*30*24*60*60*1000)
--   - p_salt 는 서버(PETITION_SALT)에서 전달 — 마이그레이션에 salt 미하드코딩
--
-- 안전성: previewAudience는 "미리보기 표시 전용"이며 실제 발송(enqueueBroadcast)은
--   resolver를 독립적으로 쓴다. 이 함수가 드리프트해도 블라스트 반경은 미리보기 숫자에 한정.
--   호출 측(admin-broadcast.ts)은 RPC 실패 시 resolver로 폴백한다.
--
-- 권한: hash_email과 동일하게 service_role 전용(anon/authenticated revoke).
-- ============================================================

-- 작가·출품자 (member): artists.contact_email ∪ profiles(role=exhibitor).email
CREATE OR REPLACE FUNCTION public.count_member_audience(p_subset text, p_salt text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH emails AS (
    SELECT lower(btrim(contact_email)) AS e
    FROM public.artists
    WHERE p_subset <> 'exhibitor'
      AND contact_email IS NOT NULL
      AND btrim(contact_email) <> ''
    UNION
    SELECT lower(btrim(email)) AS e
    FROM public.profiles
    WHERE p_subset <> 'artist'
      AND role = 'exhibitor'
      AND email IS NOT NULL
      AND btrim(email) <> ''
  )
  SELECT count(*)::int
  FROM emails em
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_suppressions s
    WHERE s.email_hash = public.hash_email(em.e, p_salt)
      AND s.channel IN ('member', 'all')
  );
$$;

-- 고객 마케팅 (customer): marketing_consent 동의자 ∪ 최근 180일 거래고객
CREATE OR REPLACE FUNCTION public.count_customer_audience(p_salt text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH emails AS (
    SELECT lower(btrim(email)) AS e
    FROM public.profiles
    WHERE role = 'user'
      AND marketing_consent = true
      AND email IS NOT NULL
      AND btrim(email) <> ''
    UNION
    SELECT lower(btrim(buyer_email)) AS e
    FROM public.orders
    WHERE status IN ('paid', 'preparing', 'shipped', 'delivered')
      AND created_at >= now() - interval '180 days'
      AND buyer_email IS NOT NULL
      AND btrim(buyer_email) <> ''
  )
  SELECT count(*)::int
  FROM emails em
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_suppressions s
    WHERE s.email_hash = public.hash_email(em.e, p_salt)
      AND s.channel IN ('customer', 'all')
  );
$$;

-- 특정 작품 구매자 (artwork-buyer): orders.artwork_id 일치 + payable 상태 (광고 시 180일 제한)
CREATE OR REPLACE FUNCTION public.count_artwork_buyer_audience(
  p_artwork_id text,
  p_advertising boolean,
  p_salt text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH emails AS (
    SELECT lower(btrim(buyer_email)) AS e
    FROM public.orders
    WHERE artwork_id::text = p_artwork_id
      AND status IN ('paid', 'preparing', 'shipped', 'delivered')
      AND buyer_email IS NOT NULL
      AND btrim(buyer_email) <> ''
      AND (NOT p_advertising OR created_at >= now() - interval '180 days')
  )
  SELECT count(*)::int
  FROM emails em
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_suppressions s
    WHERE s.email_hash = public.hash_email(em.e, p_salt)
      AND s.channel IN ('customer', 'all')
  );
$$;

-- 청원 서명자 (petition): is_masked=false, email 존재
CREATE OR REPLACE FUNCTION public.count_petition_audience(p_slug text, p_salt text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
  WITH emails AS (
    SELECT lower(btrim(email)) AS e
    FROM public.petition_signatures
    WHERE petition_slug = p_slug
      AND is_masked = false
      AND email IS NOT NULL
      AND btrim(email) <> ''
  )
  SELECT count(*)::int
  FROM emails em
  WHERE NOT EXISTS (
    SELECT 1 FROM public.email_suppressions s
    WHERE s.email_hash = public.hash_email(em.e, p_salt)
      AND s.channel IN ('petition', 'all')
  );
$$;

-- 권한: 민감 데이터(이메일·suppression) 접근이므로 service_role 전용
REVOKE ALL ON FUNCTION public.count_member_audience(text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.count_customer_audience(text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.count_artwork_buyer_audience(text, boolean, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.count_petition_audience(text, text) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.count_member_audience(text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_customer_audience(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_artwork_buyer_audience(text, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.count_petition_audience(text, text) TO service_role;
