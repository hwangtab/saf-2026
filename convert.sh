#!/bin/bash
find ./public/images -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) -not -name "og-image.png" | while read -r img; do
  cwebp -q 80 "$img" -o "${img%.*}.webp"
done
