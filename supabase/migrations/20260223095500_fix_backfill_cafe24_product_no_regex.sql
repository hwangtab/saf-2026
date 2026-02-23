-- Fix backfill regex by using PostgreSQL substring capture groups.
-- This re-runs backfill safely only for rows still missing cafe24_product_no.

UPDATE public.artworks
SET
  cafe24_product_no = COALESCE(
    NULLIF(substring(shop_url FROM '/surl/O/([0-9]+)'), '')::bigint,
    NULLIF(substring(shop_url FROM '[?&]product_no=([0-9]+)'), '')::bigint
  ),
  updated_at = now()
WHERE cafe24_product_no IS NULL
  AND shop_url IS NOT NULL
  AND (
    shop_url ~ '/surl/O/[0-9]+'
    OR shop_url ~ '[?&]product_no=[0-9]+'
  );
