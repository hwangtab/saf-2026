-- Normalize artwork size values to standard WxHcm (or WxHxDcm) format
-- Matches changes applied to content/artworks-batches/batch-db-generated.ts

BEGIN;

-- Empty / NULL → 확인 중
UPDATE artworks SET size = '확인 중' WHERE size IS NULL OR trim(size) = '';

-- Asterisk separator
UPDATE artworks SET size = '53x45.5cm' WHERE size = '53cm* 45.5cm';

-- Uppercase X
UPDATE artworks SET size = '24.2x24.2cm' WHERE size = '24.2X24.2cm';

-- No unit (assumed cm)
UPDATE artworks SET size = '24.2x33.4cm' WHERE size = '24.2x33.4';
UPDATE artworks SET size = '37.8x37.8cm' WHERE size = '37.8x37.8';
UPDATE artworks SET size = '81x61cm'     WHERE size = '81x61';

-- Unicode × separator
UPDATE artworks SET size = '16x22cm'   WHERE size = '16×22cm';
UPDATE artworks SET size = '50x42cm'   WHERE size = '50×42cm';
UPDATE artworks SET size = '130x60cm'  WHERE size = '130×60cm';
UPDATE artworks SET size = '60x50cm'   WHERE size = '60×50cm';
UPDATE artworks SET size = '96x64cm'   WHERE size = '96×64cm';
UPDATE artworks SET size = '98x42cm'   WHERE size = '98×42cm';
UPDATE artworks SET size = '76x47cm'   WHERE size = '76×47cm';

-- Spaces around separator
UPDATE artworks SET size = '41x27.3cm'   WHERE size = '41 x 27.3cm';
UPDATE artworks SET size = '53x41cm'     WHERE size = '53 x 41cm';
UPDATE artworks SET size = '53x45.5cm'   WHERE size = '53 x 45.5cm';
UPDATE artworks SET size = '33.4x53.0cm' WHERE size = '33.4 x 53.0cm';
UPDATE artworks SET size = '65.1x53cm'   WHERE size = '65.1 x 53cm';
UPDATE artworks SET size = '51x45cm'     WHERE size = '51 x 45cm';

-- Unit embedded between dimensions
UPDATE artworks SET size = '19x24cm' WHERE size = '19cmx24cm';

-- Unit on each dimension
UPDATE artworks SET size = '90x72cm' WHERE size = '90cm × 72cm';

-- Dash separator
UPDATE artworks SET size = '116x91cm' WHERE size = '116cm - 91cm';

-- Ho+cm hybrid (no unit on dimensions)
UPDATE artworks SET size = '33.4x45.5cm' WHERE size = '33.4x45.5(P8호)';

-- cm+ho hybrid
UPDATE artworks SET size = '72.7x50cm'   WHERE size = '72.7×50cm(M20호)';
UPDATE artworks SET size = '60.6x72.7cm' WHERE size = '60.6×72.7cm(F20호)';

-- F-number with cm in parentheses
UPDATE artworks SET size = '45.5x53cm' WHERE size = '10F (45.5 x 53cm)';

-- A4 size
UPDATE artworks SET size = '21x29.7cm' WHERE size = 'A4 size';

-- inch → cm
UPDATE artworks SET size = '27.9x101.6cm' WHERE size = '11x40inch';

-- mm → cm
UPDATE artworks SET size = '1.2x1.2x28.5cm' WHERE size = '12x12x285mm';

-- Bare Korean ho (using F-type dimensions from HO_SIZES table)
UPDATE artworks SET size = '45.5x37.9cm' WHERE size = '8호';
UPDATE artworks SET size = '90.9x72.7cm' WHERE size = '30호';

COMMIT;
