#!/usr/bin/env bash
# Font subsetting script — reduces Korean web fonts to essential character ranges
# Requires: fonttools + brotli (pip install fonttools brotli)
#
# Unicode ranges included:
#   U+0000-007F  Basic Latin (ASCII)
#   U+00A0-00FF  Latin-1 Supplement
#   U+0100-024F  Latin Extended-A/B
#   U+2000-206F  General Punctuation
#   U+2190-21FF  Arrows
#   U+2200-22FF  Mathematical Operators
#   U+3000-303F  CJK Symbols & Punctuation
#   U+3131-318E  Hangul Compatibility Jamo
#   U+AC00-D7AF  Hangul Syllables (all 11,172 modern Korean chars)
#   U+F900-FAFF  CJK Compatibility Ideographs
#   U+FE10-FE1F  Vertical Forms
#   U+FF00-FFEF  Halfwidth & Fullwidth Forms

set -euo pipefail

FONTS_DIR="$(cd "$(dirname "$0")/../public/fonts" && pwd)"
PYFTSUBSET="${PYFTSUBSET:-pyftsubset}"

UNICODE_RANGES="U+0000-007F,U+00A0-00FF,U+0100-024F,U+2000-206F,U+2190-21FF,U+2200-22FF,U+3000-303F,U+3131-318E,U+AC00-D7AF,U+F900-FAFF,U+FE10-FE1F,U+FF00-FFEF"

FONTS=(
  "Paperlogy-4Regular.woff2"
  "Paperlogy-5Medium.woff2"
  "Paperlogy-7Bold.woff2"
  "PartialSansKR-Regular.woff2"
  "HakgyoansimPosterB.woff2"
)

echo "=== Font Subsetting ==="
echo "Directory: $FONTS_DIR"
echo ""

for font in "${FONTS[@]}"; do
  src="$FONTS_DIR/$font"
  if [ ! -f "$src" ]; then
    echo "SKIP: $font (not found)"
    continue
  fi

  before=$(wc -c < "$src" | tr -d ' ')
  backup="$src.bak"

  # Backup original
  cp "$src" "$backup"

  # Subset
  "$PYFTSUBSET" "$backup" \
    --output-file="$src" \
    --flavor=woff2 \
    --layout-features='*' \
    --unicodes="$UNICODE_RANGES"

  after=$(wc -c < "$src" | tr -d ' ')
  saved=$(( before - after ))
  pct=$(( saved * 100 / before ))

  echo "$font: $(( before / 1024 ))KB → $(( after / 1024 ))KB (-${pct}%)"
done

echo ""
echo "Done. Backups saved as .woff2.bak files."
echo "Remove backups when satisfied: rm $FONTS_DIR/*.bak"
