BEGIN;

-- For artworks where title is already in English (no Korean characters),
-- copy title to title_en so the field is not NULL
UPDATE artworks
SET title_en = title
WHERE title_en IS NULL
  AND title !~ '[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]';

COMMIT;
