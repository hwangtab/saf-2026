# GSC Rich Results Audit

Generated: 2026-06-15T08:53:53.975Z
Date range: 2026-05-16 ~ 2026-06-12

## Summary

| Metric                | Count |
| --------------------- | ----: |
| Search Analytics URLs |   250 |
| Sitemap URLs          |   823 |
| Target URLs           |    60 |
| Inspected URLs        |    60 |
| Indexed URLs          |    40 |
| Rich result PASS URLs |    38 |
| Rich result FAIL URLs |     2 |
| ERROR issues          |     4 |
| WARNING issues        |    25 |
| Failed inspections    |     0 |

## Issue Groups

| Priority | Severity | Rich result       | Count | Message                                 | Page types     | Code pointers                                                 | Example URL                                                           |
| -------- | -------- | ----------------- | ----: | --------------------------------------- | -------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| P1       | ERROR    | FAQ               |     4 | Duplicate field "FAQPage"               | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/0169e066-9557-4129-a61f-4d369066dca8 |
| P2       | WARNING  | Image Metadata    |     6 | Missing field "creditText"              | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/01ecbea9-e777-4ccd-8180-7b9e135ca966 |
| P2       | WARNING  | Image Metadata    |     6 | Missing field "copyrightNotice"         | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/01ecbea9-e777-4ccd-8180-7b9e135ca966 |
| P2       | WARNING  | Product snippets  |     5 | Missing field "review"                  | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/014cf76d-8b9c-41dd-a335-febf48a9d8a4 |
| P2       | WARNING  | Product snippets  |     5 | Missing field "aggregateRating"         | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/014cf76d-8b9c-41dd-a335-febf48a9d8a4 |
| P2       | WARNING  | Merchant listings |     1 | Invalid object type for field "size"    | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/10                                   |
| P2       | WARNING  | Merchant listings |     1 | Missing field "shippingDetails"         | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/100e14e5-5934-4d9c-942e-3ae74d20f7f1 |
| P2       | WARNING  | Merchant listings |     1 | Missing field "hasMerchantReturnPolicy" | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts | https://www.saf2026.com/artworks/100e14e5-5934-4d9c-942e-3ae74d20f7f1 |

## Retry URLs

No failed inspections.
