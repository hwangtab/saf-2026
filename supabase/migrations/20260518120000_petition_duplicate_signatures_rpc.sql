-- 동명이인 서명자 목록 페이지네이션 RPC
-- admin 페이지 SignaturesTab duplicates 필터에서 사용.
-- service_role 전용 (admin server action에서만 호출).
CREATE OR REPLACE FUNCTION get_petition_duplicate_signatures(
  p_slug    text,
  p_search  text    DEFAULT NULL,
  p_limit   int     DEFAULT 50,
  p_offset  int     DEFAULT 0
)
RETURNS TABLE (
  rows  jsonb,
  total bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  WITH dup_keys AS (
    SELECT lower(trim(full_name)) AS key
    FROM   petition_signatures
    WHERE  petition_slug = p_slug
    GROUP  BY lower(trim(full_name))
    HAVING count(*) >= 2
  ),
  matched AS (
    SELECT s.id,
           s.full_name,
           s.email,
           s.phone,
           s.region_top,
           s.region_sub,
           s.is_committee,
           s.message,
           s.message_public,
           s.is_masked,
           s.created_at
    FROM   petition_signatures s
    JOIN   dup_keys             d ON lower(trim(s.full_name)) = d.key
    WHERE  s.petition_slug = p_slug
      AND  (
             p_search IS NULL OR p_search = '' OR
             s.full_name ILIKE '%' || p_search || '%' OR
             s.email     ILIKE '%' || p_search || '%' OR
             coalesce(s.phone, '') ILIKE '%' || p_search || '%'
           )
  )
  SELECT
    (
      SELECT coalesce(
               jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC),
               '[]'::jsonb
             )
      FROM (
        SELECT * FROM matched
        ORDER  BY created_at DESC
        LIMIT  p_limit
        OFFSET p_offset
      ) m
    ) AS rows,
    (SELECT count(*) FROM matched) AS total;
$$;

-- anon/authenticated는 이 함수를 호출할 수 없음
REVOKE EXECUTE ON FUNCTION get_petition_duplicate_signatures FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION get_petition_duplicate_signatures TO service_role;
