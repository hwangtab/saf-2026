-- Normalize story tags for artist stories and remove manual inline footer links

update public.stories
set
  tags = array['민병산']::text[],
  updated_at = now()
where slug = 'min-byungsan-philosopher'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['박생광']::text[],
  updated_at = now()
where slug = 'park-saenggwang-last-transformation'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['강석태']::text[],
  updated_at = now()
where slug = 'kang-seoktae-little-prince'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['이철수']::text[],
  updated_at = now()
where slug = 'lee-cheolsu-from-resistance-to-zen'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['박재동']::text[],
  updated_at = now()
where slug = 'park-jaedong-25-artworks'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['오윤']::text[],
  updated_at = now()
where slug = 'oh-yun-40th-anniversary'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  tags = array['주재환']::text[],
  updated_at = now()
where slug = 'joo-jaehwan-art-and-life'
  and coalesce(array_length(tags, 1), 0) = 0;

update public.stories
set
  body = regexp_replace(
    body,
    E'\\n\\n\\[[^\\]]+의 작품 보기\\]\\(/artworks/artist/[^)]+\\) · \\[관련 매거진\\]\\(/stories/category/artist-story\\)\\s*$',
    '',
    'g'
  ),
  updated_at = now()
where slug in (
  'meet-artist-yoon-gyeom',
  'meet-artist-lee-hyeonjeong',
  'meet-artist-kim-gyuhak',
  'meet-artist-kim-dongseok'
);
