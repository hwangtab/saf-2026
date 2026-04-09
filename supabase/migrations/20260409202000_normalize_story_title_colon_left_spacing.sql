update public.stories
set
  title = regexp_replace(title, '[[:space:]]+:', ':', 'g'),
  title_en = case
    when title_en is null then null
    else regexp_replace(title_en, '[[:space:]]+:', ':', 'g')
  end,
  updated_at = now()
where title ~ '[[:space:]]+:' or coalesce(title_en, '') ~ '[[:space:]]+:';
