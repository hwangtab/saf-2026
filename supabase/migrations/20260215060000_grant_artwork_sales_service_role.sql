-- Grant service_role full access to artwork_sales table
-- This allows scripts using SUPABASE_SERVICE_ROLE_KEY to insert sales records

GRANT ALL ON public.artwork_sales TO service_role;
GRANT ALL ON public.artwork_sales TO authenticated;
