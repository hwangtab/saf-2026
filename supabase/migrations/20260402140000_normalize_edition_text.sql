-- Normalize edition text field for consistent display
-- "X/Y" → "에디션 X/Y" (prefix was missing)
-- "1" → "" (bare number is meaningless, edition_type handles business logic)

BEGIN;

UPDATE artworks
  SET edition = '에디션 ' || edition
  WHERE edition ~ '^\d+/\d+$';

UPDATE artworks
  SET edition = ''
  WHERE edition ~ '^\d+$';

COMMIT;
