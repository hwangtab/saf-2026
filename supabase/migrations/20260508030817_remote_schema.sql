alter table "public"."artworks" drop constraint "artworks_artist_id_title_key";

drop index if exists "public"."artworks_artist_id_title_key";

alter table "public"."news" add column "description_en" text;

alter table "public"."news" add column "title_en" text;

alter table "public"."reviews" add column "author_en" text;

alter table "public"."reviews" add column "comment_en" text;

alter table "public"."reviews" add column "role_en" text;

alter table "public"."testimonials" add column "author_en" text;

alter table "public"."testimonials" add column "category_en" text;

alter table "public"."testimonials" add column "context_en" text;

alter table "public"."testimonials" add column "quote_en" text;

alter table "public"."videos" add column "description_en" text;

alter table "public"."videos" add column "title_en" text;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_artwork_sold_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE artworks
  SET sold_at = NEW.sold_at
  WHERE id = NEW.artwork_id
    AND (sold_at IS NULL OR NEW.sold_at > sold_at);
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."artists" to "service_role";

grant insert on table "public"."artists" to "service_role";

grant references on table "public"."artists" to "service_role";

grant select on table "public"."artists" to "service_role";

grant trigger on table "public"."artists" to "service_role";

grant truncate on table "public"."artists" to "service_role";

grant update on table "public"."artists" to "service_role";

grant delete on table "public"."artworks" to "service_role";

grant insert on table "public"."artworks" to "service_role";

grant references on table "public"."artworks" to "service_role";

grant select on table "public"."artworks" to "service_role";

grant trigger on table "public"."artworks" to "service_role";

grant truncate on table "public"."artworks" to "service_role";

grant update on table "public"."artworks" to "service_role";

grant delete on table "public"."faq" to "service_role";

grant insert on table "public"."faq" to "service_role";

grant references on table "public"."faq" to "service_role";

grant select on table "public"."faq" to "service_role";

grant trigger on table "public"."faq" to "service_role";

grant truncate on table "public"."faq" to "service_role";

grant update on table "public"."faq" to "service_role";

grant delete on table "public"."news" to "service_role";

grant insert on table "public"."news" to "service_role";

grant references on table "public"."news" to "service_role";

grant select on table "public"."news" to "service_role";

grant trigger on table "public"."news" to "service_role";

grant truncate on table "public"."news" to "service_role";

grant update on table "public"."news" to "service_role";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."testimonials" to "service_role";

grant insert on table "public"."testimonials" to "service_role";

grant references on table "public"."testimonials" to "service_role";

grant select on table "public"."testimonials" to "service_role";

grant trigger on table "public"."testimonials" to "service_role";

grant truncate on table "public"."testimonials" to "service_role";

grant update on table "public"."testimonials" to "service_role";

grant delete on table "public"."videos" to "service_role";

grant insert on table "public"."videos" to "service_role";

grant references on table "public"."videos" to "service_role";

grant select on table "public"."videos" to "service_role";

grant trigger on table "public"."videos" to "service_role";

grant truncate on table "public"."videos" to "service_role";

grant update on table "public"."videos" to "service_role";

CREATE TRIGGER trg_sync_artwork_sold_at AFTER INSERT ON public.artwork_sales FOR EACH ROW EXECUTE FUNCTION public.sync_artwork_sold_at();


