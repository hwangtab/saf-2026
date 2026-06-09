-- 관리자 이메일 본문을 markdown/text 문단 모델에서 rich HTML + plain text 모델로 전환한다.
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS body_text text;

UPDATE public.email_broadcasts
SET
  body_text = COALESCE(body_text, body_md),
  body_html = COALESCE(
    body_html,
    (
      SELECT string_agg(
        '<p style="margin:0 0 14px;font-size:14px;line-height:1.7;color:#555E67">' ||
          replace(
            replace(
              replace(
                replace(
                  replace(paragraph, '&', '&amp;'),
                  '<', '&lt;'
                ),
                '>', '&gt;'
              ),
              '"', '&quot;'
            ),
            E'\n', '<br>'
          ) ||
        '</p>',
        ''
      )
      FROM regexp_split_to_table(COALESCE(body_md, ''), E'\n\\s*\n') AS paragraph
      WHERE btrim(paragraph) <> ''
    )
  )
WHERE body_html IS NULL OR body_text IS NULL;

ALTER TABLE public.email_broadcasts
  ALTER COLUMN body_html SET NOT NULL,
  ALTER COLUMN body_text SET NOT NULL;

ALTER TABLE public.email_broadcasts
  DROP COLUMN IF EXISTS body_md;
