BEGIN;

SET LOCAL lock_timeout = '5s';

ALTER TABLE public.faq
  ADD COLUMN IF NOT EXISTS question_en text,
  ADD COLUMN IF NOT EXISTS answer_en text;

COMMENT ON COLUMN public.faq.question_en IS 'FAQ 영어 질문';
COMMENT ON COLUMN public.faq.answer_en IS 'FAQ 영어 답변';

COMMIT;
