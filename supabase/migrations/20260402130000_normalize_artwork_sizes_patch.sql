-- Patch: 2 remaining non-standard size values missed by initial migration

BEGIN;

-- 8F format (variant not covered by initial migration)
UPDATE artworks SET size = '45.5x37.9cm' WHERE size = '8F (45.5 x 37.9 cm)';

-- Trailing space variant
UPDATE artworks SET size = '90x72cm' WHERE trim(size) = '90cm × 72cm';

COMMIT;
