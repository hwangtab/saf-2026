# GSC Rich Results Audit

Generated: 2026-06-09T03:52:24.948Z
Date range: 2026-05-10 ~ 2026-06-06

## Summary

| Metric                | Count |
| --------------------- | ----: |
| Search Analytics URLs |   250 |
| Sitemap URLs          |   808 |
| Target URLs           |   865 |
| Inspected URLs        |   865 |
| Indexed URLs          |   724 |
| Rich result PASS URLs |   542 |
| Rich result FAIL URLs |   181 |
| ERROR issues          |   525 |
| WARNING issues        |   603 |
| Failed inspections    |     0 |

## Issue Groups

| Priority | Severity | Rich result         | Count | Message                                                             | Page types     | Code pointers                                                           | Example URL                                                                 |
| -------- | -------- | ------------------- | ----: | ------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| P1       | ERROR    | Product snippets    |   371 | Either "offers", "review", or "aggregateRating" should be specified | magazine_story | app/[locale]/stories/[slug]/page.tsx<br>lib/schemas/content.ts          | https://www.saf2026.com/en/stories/korean-documentary-landscape-photography |
| P1       | ERROR    | FAQ                 |   106 | Duplicate field "FAQPage"                                           | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/0169e066-9557-4129-a61f-4d369066dca8       |
| P1       | ERROR    | Unknown rich result |    32 | Invalid object type for field "mainEntity"                          | artist_page    | app/[locale]/artworks/artist/[artist]/page.tsx<br>lib/schemas/artist.ts | https://www.saf2026.com/artworks/artist/%EA%B0%95%EB%A0%88%EC%95%84         |
| P1       | ERROR    | Review snippets     |    15 | Invalid object type for field "itemReviewed"                        | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/our-reality                                         |
| P1       | ERROR    | Q&amp;A             |     1 | Duplicate field "mainEntity"                                        | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/en/our-reality                                      |
| P2       | WARNING  | Image Metadata      |   199 | Missing field "creditText"                                          | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/014cf76d-8b9c-41dd-a335-febf48a9d8a4       |
| P2       | WARNING  | Image Metadata      |   199 | Missing field "copyrightNotice"                                     | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/014cf76d-8b9c-41dd-a335-febf48a9d8a4       |
| P2       | WARNING  | Product snippets    |    71 | Missing field "review"                                              | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/0124709a-e046-4603-adc6-ad82e98538de       |
| P2       | WARNING  | Product snippets    |    71 | Missing field "aggregateRating"                                     | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/0124709a-e046-4603-adc6-ad82e98538de       |
| P2       | WARNING  | Merchant listings   |    27 | Invalid object type for field "size"                                | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/0124709a-e046-4603-adc6-ad82e98538de       |
| P2       | WARNING  | Q&amp;A             |    14 | Missing field "datePublished"                                       | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/en/our-reality                                      |
| P2       | WARNING  | Q&amp;A             |     7 | Missing field "text"                                                | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/en/our-reality                                      |
| P2       | WARNING  | Q&amp;A             |     7 | Missing field "author"                                              | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/en/our-reality                                      |
| P2       | WARNING  | Q&amp;A             |     7 | Missing field "upvoteCount"                                         | other          | app/[locale]/**/page.tsx<br>lib/schemas/**                              | https://www.saf2026.com/en/our-reality                                      |
| P2       | WARNING  | Merchant listings   |     1 | Invalid object type for field "audience"                            | artwork_detail | app/[locale]/artworks/[id]/page.tsx<br>lib/schemas/artwork.ts           | https://www.saf2026.com/artworks/0124709a-e046-4603-adc6-ad82e98538de       |

## Retry URLs

No failed inspections.
