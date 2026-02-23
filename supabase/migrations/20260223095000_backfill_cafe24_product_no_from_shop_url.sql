-- Backfill legacy artworks where shop_url exists but cafe24_product_no is null.
-- This improves Cafe24 order-item -> artwork mapping reliability.

UPDATE public.artworks
SET
  cafe24_product_no = COALESCE(
    NULLIF((regexp_match(shop_url, '/surl/O/(\\d+)'))[1], '')::bigint,
    NULLIF((regexp_match(shop_url, '[?&]product_no=(\\d+)'))[1], '')::bigint
  ),
  updated_at = now()
WHERE cafe24_product_no IS NULL
  AND shop_url IS NOT NULL
  AND (
    shop_url ~ '/surl/O/[0-9]+'
    OR shop_url ~ '[?&]product_no=[0-9]+'
  );
