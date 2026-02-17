GRANT ALL ON TABLE public.artist_applications TO service_role;
GRANT ALL ON TABLE public.exhibitor_applications TO service_role;

GRANT ALL ON TABLE public.artist_applications TO authenticated;
GRANT ALL ON TABLE public.exhibitor_applications TO authenticated;

NOTIFY pgrst, 'reload';
