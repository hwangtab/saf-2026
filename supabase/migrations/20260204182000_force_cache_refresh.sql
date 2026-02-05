-- High-impact migration to trigger schema reload
CREATE TABLE public.cache_trigger (id uuid primary key);
DROP TABLE public.cache_trigger;
