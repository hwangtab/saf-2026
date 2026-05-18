-- petition_signatures 테이블 INSERT/UPDATE/DELETE 시 petitions.signature_total / committee_total을
-- O(1)으로 증분해 petition_counts VIEW의 풀스캔 집계를 제거한다.
-- recent_24h, region_top_count는 sliding window / DISTINCT 특성상 trigger 증분 불가 → 집계 유지.
-- DB 폭주 응급 조치(MAINTENANCE_MODE=true) 해제 전에 적용하는 항구 조치.

-- 1. counter columns
ALTER TABLE public.petitions
  ADD COLUMN IF NOT EXISTS signature_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS committee_total integer NOT NULL DEFAULT 0;

-- 2. backfill — is_masked=false 기준 (기존 view 정의와 동일)
UPDATE public.petitions p SET
  signature_total = sub.total,
  committee_total = sub.committee
FROM (
  SELECT
    petition_slug,
    COUNT(*)::integer                          AS total,
    COUNT(*) FILTER (WHERE is_committee)::integer AS committee
  FROM public.petition_signatures
  WHERE is_masked = false
  GROUP BY petition_slug
) sub
WHERE p.slug = sub.petition_slug;

-- 3. trigger function
CREATE OR REPLACE FUNCTION public.petition_signature_count_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_masked = false THEN
      UPDATE public.petitions
        SET signature_total = signature_total + 1,
            committee_total = committee_total + CASE WHEN NEW.is_committee THEN 1 ELSE 0 END
        WHERE slug = NEW.petition_slug;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_masked = false AND NEW.is_masked = true THEN
      -- purge_petition_pii 등에 의한 마스킹 → 카운트 차감
      UPDATE public.petitions
        SET signature_total = GREATEST(signature_total - 1, 0),
            committee_total = GREATEST(committee_total - CASE WHEN OLD.is_committee THEN 1 ELSE 0 END, 0)
        WHERE slug = NEW.petition_slug;
    ELSIF OLD.is_masked = true AND NEW.is_masked = false THEN
      -- 역방향 방어 (운영상 발생 안 해야 하지만)
      UPDATE public.petitions
        SET signature_total = signature_total + 1,
            committee_total = committee_total + CASE WHEN NEW.is_committee THEN 1 ELSE 0 END
        WHERE slug = NEW.petition_slug;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_masked = false THEN
      UPDATE public.petitions
        SET signature_total = GREATEST(signature_total - 1, 0),
            committee_total = GREATEST(committee_total - CASE WHEN OLD.is_committee THEN 1 ELSE 0 END, 0)
        WHERE slug = OLD.petition_slug;
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS petition_signature_count ON public.petition_signatures;
CREATE TRIGGER petition_signature_count
AFTER INSERT OR UPDATE OF is_masked, is_committee OR DELETE
ON public.petition_signatures
FOR EACH ROW EXECUTE FUNCTION public.petition_signature_count_update();

-- 4. petition_counts VIEW 재정의
--    total / committee_total → petitions 단일 행 lookup (O(1))
--    recent_24h / region_top_count → 기존 집계 유지 (index 활용)
CREATE OR REPLACE VIEW public.petition_counts
WITH (security_invoker = false) AS
SELECT
  p.slug                                                                     AS petition_slug,
  p.title,
  p.goal,
  p.deadline_at,
  p.is_active,
  p.signature_total                                                          AS total,
  p.committee_total,
  COALESCE(
    COUNT(DISTINCT s.region_top) FILTER (WHERE s.is_masked = false),
    0
  )::integer                                                                 AS region_top_count,
  COALESCE(
    COUNT(*) FILTER (WHERE s.is_masked = false
                       AND s.created_at > now() - interval '24 hours'),
    0
  )::integer                                                                 AS recent_24h
FROM public.petitions p
LEFT JOIN public.petition_signatures s ON s.petition_slug = p.slug
GROUP BY p.slug, p.title, p.goal, p.deadline_at, p.is_active,
         p.signature_total, p.committee_total;

GRANT SELECT ON public.petition_counts TO anon, authenticated, service_role;
