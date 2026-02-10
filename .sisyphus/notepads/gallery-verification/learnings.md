# Gallery Verification Learnings

## Issues Found

- The artworks gallery feature is currently broken.
- **Root Cause**: Property name mismatch between data fetching and UI components.
  - `lib/supabase-data.ts` returns `image: string` (first element of array).
  - `ArtworkCard` and `ArtworkImage` expect `images: string[]`.
  - Type definition in `types/index.ts` has been updated to `images: string[]`, but data fetching logic was not correctly synchronized.
- **Impact**: Runtime errors in `ArtworkCard` (`artwork.images[0]` is undefined) and `ArtworkImage`, preventing the artworks list and detail pages from rendering.

## Test Results

- **Script**: `e2e/artwork-gallery.spec.ts` (created and run).
- **Environment**: Local dev server (port 3000).
- **Outcome**: The test failed because the pages show "작품을 불러올 수 없습니다" (Cannot load artwork) due to the aforementioned bugs.
- **Lightbox**: Basic lightbox functionality (zoom, navigation) could not be verified on real data because the detail page fails to hydrate correctly.

## Recommendations

1. Fix `lib/supabase-data.ts` to return `images: item.images || []` instead of `image: item.images?.[0] || ''`.
2. Ensure all components using artworks are updated to handle the `images` array consistently.
