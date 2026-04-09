-- Normalize dash-like characters in story titles for Partial Sans compatibility.

update public.stories
set
  title = regexp_replace(title, '[—–‑]|-', ':', 'g'),
  title_en = case
    when title_en is null then null
    else regexp_replace(title_en, '[—–‑]|-', ':', 'g')
  end,
  updated_at = now()
where title ~ '[—–‑]|-' or coalesce(title_en, '') ~ '[—–‑]|-';
