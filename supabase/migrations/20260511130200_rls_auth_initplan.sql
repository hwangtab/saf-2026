-- RLS auth.uid() initplan 최적화.
--
-- Supabase performance advisor `auth_rls_initplan` 44건 해소.
-- `auth.uid() = column` 형태는 row마다 auth.uid()를 재평가해 비용이 row 수에 선형.
-- `(select auth.uid()) = column`로 wrap하면 plan에서 한 번만 평가 — 큰 효과.
-- 동작은 동일.
--
-- 가장 hot path: artworks SELECT(`Public viewable`), artists SELECT(`Users can select`).
-- 공개 페이지 SSG/ISR이 매 revalidate마다 379×N row 평가에서 N row 평가로 감소.

-- ─── activity_logs ───────────────────────────────────────────
ALTER POLICY "artists_can_insert_own_activity_logs" ON public.activity_logs
  WITH CHECK ((get_my_role() = 'artist'::text) AND (actor_role = 'artist'::text) AND (actor_id = (select auth.uid())));
ALTER POLICY "exhibitors_can_insert_own_activity_logs" ON public.activity_logs
  WITH CHECK ((get_my_role() = 'exhibitor'::text) AND (actor_role = 'exhibitor'::text) AND (actor_id = (select auth.uid())));

-- ─── artist_applications ─────────────────────────────────────
ALTER POLICY "Admins manage all applications" ON public.artist_applications
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role));
ALTER POLICY "Users manage own application" ON public.artist_applications
  USING (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.status = ANY (ARRAY['pending'::user_status, 'active'::user_status])))
  WITH CHECK (user_id = (select auth.uid()) AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.status = ANY (ARRAY['pending'::user_status, 'active'::user_status])));

-- ─── artists ─────────────────────────────────────────────────
ALTER POLICY "Artists delete own" ON public.artists
  USING (((user_id = (select auth.uid())) AND (get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Artists insert own" ON public.artists
  WITH CHECK (((user_id = (select auth.uid())) AND (get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Artists update own" ON public.artists
  USING (((user_id = (select auth.uid())) AND (get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Users can delete their own artists" ON public.artists
  USING ((select auth.uid()) = owner_id);
ALTER POLICY "Users can insert artists if they have permission" ON public.artists
  WITH CHECK ((select auth.uid()) = owner_id);
ALTER POLICY "Users can select their own artists" ON public.artists
  USING ((select auth.uid()) = owner_id);
ALTER POLICY "Users can update their own artists" ON public.artists
  USING ((select auth.uid()) = owner_id);

-- ─── artwork_sales ───────────────────────────────────────────
ALTER POLICY "Admins can manage sales" ON public.artwork_sales
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── artworks (hot path — 공개 페이지 매 SSG revalidate) ────
ALTER POLICY "Artists delete own artworks" ON public.artworks
  USING ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.user_id = (select auth.uid()) AND get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Artists insert own artworks" ON public.artworks
  WITH CHECK ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.user_id = (select auth.uid()) AND get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Artists update own artworks" ON public.artworks
  USING ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.user_id = (select auth.uid()) AND get_my_role() = 'artist'::text)) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Exhibitors delete own artworks" ON public.artworks
  USING ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.owner_id = (select auth.uid()))) AND (get_my_role() = 'exhibitor'::text));
ALTER POLICY "Exhibitors insert own artworks" ON public.artworks
  WITH CHECK ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.owner_id = (select auth.uid()))) AND (get_my_role() = 'exhibitor'::text));
ALTER POLICY "Exhibitors select own artworks" ON public.artworks
  USING ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.owner_id = (select auth.uid()))) AND (get_my_role() = 'exhibitor'::text));
ALTER POLICY "Exhibitors update own artworks" ON public.artworks
  USING ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.owner_id = (select auth.uid()))) AND (get_my_role() = 'exhibitor'::text));
ALTER POLICY "Public viewable artworks" ON public.artworks
  USING ((NOT is_hidden) OR ((EXISTS (SELECT 1 FROM artists a WHERE a.id = artworks.artist_id AND a.user_id = (select auth.uid()))) AND (get_my_role() = 'artist'::text) AND (get_my_status() = 'active'::text)) OR (get_my_role() = 'admin'::text));

-- ─── exhibitor_applications ──────────────────────────────────
ALTER POLICY "Admins manage all exhibitor applications" ON public.exhibitor_applications
  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = (select auth.uid()) AND p.role = 'admin'::user_role));
ALTER POLICY "Users manage own exhibitor application" ON public.exhibitor_applications
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ─── faq ─────────────────────────────────────────────────────
ALTER POLICY "Admins manage all faq" ON public.faq
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── feedback ────────────────────────────────────────────────
ALTER POLICY "Admins can read all feedback" ON public.feedback
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));
ALTER POLICY "Admins can update feedback" ON public.feedback
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));
ALTER POLICY "Users can insert own feedback" ON public.feedback
  WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can read own feedback" ON public.feedback
  USING ((select auth.uid()) = user_id);

-- ─── gsc_metrics ─────────────────────────────────────────────
ALTER POLICY "Admins can read gsc_metrics" ON public.gsc_metrics
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── news ────────────────────────────────────────────────────
ALTER POLICY "Admins manage all news" ON public.news
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── orders ──────────────────────────────────────────────────
ALTER POLICY "Admins can manage orders" ON public.orders
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));
ALTER POLICY "Buyers can view own orders" ON public.orders
  USING ((buyer_user_id IS NOT NULL) AND (buyer_user_id = (select auth.uid())));

-- ─── page_views ──────────────────────────────────────────────
ALTER POLICY "Admins can read page_views" ON public.page_views
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── payments ────────────────────────────────────────────────
ALTER POLICY "Admins can manage payments" ON public.payments
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── petition_audit_log ──────────────────────────────────────
ALTER POLICY "Audit admin read" ON public.petition_audit_log
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── petition_signatures ─────────────────────────────────────
ALTER POLICY "Signatures admin read" ON public.petition_signatures
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));
ALTER POLICY "Signatures admin update" ON public.petition_signatures
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── petitions ───────────────────────────────────────────────
ALTER POLICY "Petitions admin write" ON public.petitions
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── profiles ────────────────────────────────────────────────
ALTER POLICY "Profiles select own or admin" ON public.profiles
  USING (((select auth.uid()) = id) OR (get_my_role() = 'admin'::text));
ALTER POLICY "Profiles update own or admin" ON public.profiles
  USING (((select auth.uid()) = id) OR (get_my_role() = 'admin'::text))
  WITH CHECK (((select auth.uid()) = id) OR (get_my_role() = 'admin'::text));

-- ─── reviews ─────────────────────────────────────────────────
ALTER POLICY "Admins manage all reviews" ON public.reviews
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── stories ─────────────────────────────────────────────────
ALTER POLICY "Admins manage stories" ON public.stories
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── testimonials ────────────────────────────────────────────
ALTER POLICY "Admins manage all testimonials" ON public.testimonials
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));

-- ─── videos ──────────────────────────────────────────────────
ALTER POLICY "Admins manage all videos" ON public.videos
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'::user_role));
