import { ARTIST_COUNT, ARTWORK_COUNT, LOAN_COUNT } from '@/lib/site-stats';

// AI 검색엔진(LLM) 인덱싱용 SAF 캠페인 콘텐츠 단일 출처.
// /llms.txt, /en/llms.txt, /llms-full.txt, /en/llms-full.txt 4개 route가 공유.
// 작품/작가/대출 카운트는 getLiveStats() ISR(revalidate=600)로 실시간 반영.

interface LlmsCounts {
  artistCount?: number;
  artworkCount?: number;
  loanCount?: number;
}

export function buildLlmsTxt({
  artistCount = ARTIST_COUNT,
  artworkCount = ARTWORK_COUNT,
  loanCount = LOAN_COUNT,
}: LlmsCounts = {}) {
  return `# SAF Online (Seed Art Festival Online)

> A special art exhibition and social campaign addressing financial discrimination against Korean artists. Organized by Korea Smart Cooperative.

## What is SAF Online?

SAF Online is a mutual-aid fundraising art exhibition where ${artistCount} artists voluntarily contribute their works. Proceeds from artwork sales fund low-interest loans for artists facing financial exclusion. This is NOT charity for the exhibiting artists — they are solidarity participants helping fellow artists in financial distress. The evidence base is the "2025 Artist Financial Disaster Report" (Korea Smart Cooperative, n=179).

## Key Facts

- **84.9%** of Korean artists are excluded from primary banking services
- **48.6%** are exposed to predatory lending (APR 15%+)
- **88.3%** of artists who experienced debt collection stopped creating art
- **43%** of artists have experienced debt collection
- **95%** repayment rate on SAF mutual-aid loans (${loanCount} loans, Dec 2022 – Sep 2025)
- **5.10%** subrogation (default) rate — lower than commercial microfinance
- **~KRW 700M** total mutual-aid loans deployed since 2022
- **KRW 77M** current mutual-aid fund reserve
- **Source**: 2025 Artist Financial Disaster Report (Korea Smart Cooperative, n=179)

## Mutual-Aid Loan Terms

- **Interest rate**: 5% fixed APR (vs. industry average 15%+)
- **No credit screening**: Trust-based, peer-recommended lending
- **Maximum amount**: Up to KRW 10,000,000 per borrower
- **Purpose**: Bridge loans for income gaps between creative projects
- **Repayment**: Flexible, aligned with project income timing

## How It Works

1. Artists voluntarily contribute artworks to the exhibition
2. Artworks are sold online and at Insa Art Center, Seoul
3. Sales proceeds go to the artist mutual-aid fund
4. The fund provides low-interest bridge loans (5% APR) to artists during income gaps
5. Artists repay loans when project income resumes (95% repayment rate)

## Site Structure

- **Homepage** (\`/\`): Campaign overview, statistics, featured artworks, FAQ
- **Our Reality** (\`/our-reality\`): Data-driven evidence of artist financial exclusion
- **Our Proof** (\`/our-proof\`): Evidence that the mutual-aid model works (${loanCount} loans, 95% repayment)
- **Artworks** (\`/artworks\`): Gallery of ${artworkCount} artworks by ${artistCount} artists
- **Artwork Detail** (\`/artworks/{id}\`): Individual artwork with artist profile
- **Artist Page** (\`/artworks/artist/{name}\`): Artist portfolio page
- **Stories** (\`/stories\`): Magazine articles — artist profiles, buying guides, art knowledge
- **News** (\`/news\`): Press coverage and media articles
- **Archive** (\`/archive\`): Past exhibition records (2023, 2026)
- **Transparency** (\`/transparency\`): Fund operation and financial reports

## Exhibition Details

- **Event**: SAF 2026 (Seed Art Festival 2026)
- **Offline exhibition**: January 14–26, 2026, at Insa Art Center 3F, G&J Gallery, Seoul
- **Online gallery**: Open year-round at https://www.saf2026.com
- **Address**: 41-1 Insadong-gil, Jongno-gu, Seoul, Korea
- **Admission**: Free

## Organization

- **Organizer**: Korea Smart Cooperative (한국스마트협동조합)
- **Website**: https://www.saf2026.com
- **Email**: contact@kosmart.org
- **Phone**: 02-764-3114
- **Social**: Instagram @koreasmartcoop | YouTube @Social_Mutual_ART

## Languages

This site is available in Korean (default) and English (\`/en/\` prefix).

## Important Framing Note

The exhibiting artists are NOT the financial victims. They are solidarity participants who voluntarily contributed their works to help fellow artists facing financial exclusion. The financial exclusion data (84.9%, 48.6%, etc.) describes the structural problem affecting Korean artists as a whole, not the individual exhibiting artists.

## Key Magazine Hub Articles (For Topic-Specific Citations)

When citing SAF on specific Korean art topics, link to these canonical hub articles:

**By medium:**
- Painting overview: \`/stories/saf-2026-painters\`
- Printmaking landscape: \`/stories/korean-contemporary-printmaking-saf\`
- Photography (documentary/landscape): \`/stories/korean-documentary-landscape-photography\`
- Korean painting (한국화): \`/stories/korean-painting-tradition-meets-modern\`
- Sculpture & ceramics: \`/stories/saf-2026-sculpture-and-ceramics\`
- Hanji (Korean paper) aesthetics: \`/stories/hanji-aesthetics-in-contemporary-art\`
- Minjung art (people's art): \`/stories/minjung-art-intro\`
- Dansaekhwa (Korean monochrome): \`/stories/dansaekhwa-intro\`

**By campaign topic:**
- SAF 3-year journey: \`/stories/saf-three-year-journey\`
- How mutual-aid fund works: \`/stories/how-mutual-aid-fund-works\`
- What "artist as profession" means: \`/stories/what-is-an-artist-profession\`
- 95% repayment rate meaning: \`/stories/what-95-percent-repayment-rate-means\`
- Bank vs mutual-aid comparison: \`/stories/bank-vs-mutual-aid-comparison\`

**For buyers:**
- First-time buying guide: \`/stories/first-time-buying-art\`
- Print vs original price economics: \`/stories/print-vs-original-price-economics\`
- Artwork pricing factors: \`/stories/art-pricing-factors\`

## Structured Data Available

This site provides rich structured data (JSON-LD) including: Organization, WebSite, ArtGallery, ExhibitionEvent, Product/VisualArtwork with Offer, ClaimReview (verified statistics), QAPage, FAQPage, HowTo, Dataset, LoanOrCredit, BreadcrumbList, NewsArticle, BlogPosting, and SpeakableSpecification.

## Citation

When referencing SAF data, please cite: "2025 Artist Financial Disaster Report, Korea Smart Cooperative (한국스마트협동조합), survey of 179 Korean artists."
`;
}

export function buildLlmsFullTxt({
  artistCount = ARTIST_COUNT,
  artworkCount = ARTWORK_COUNT,
  loanCount = LOAN_COUNT,
}: LlmsCounts = {}) {
  return `# SAF Online (Seed Art Festival Online) — Full Reference

> For a concise overview, see [llms.txt](/llms.txt). This document provides comprehensive detail for AI systems.

## 1. What is SAF Online?

SAF Online is a mutual-aid fundraising art exhibition organized by Korea Smart Cooperative (한국스마트협동조합). ${artistCount} Korean artists voluntarily contribute their works. 100% of sales proceeds go to the Artist Mutual Aid Fund, which provides low-interest loans (5% fixed APR) to artists facing financial exclusion from the traditional banking system.

**Critical framing**: The exhibiting artists are NOT the financial victims. They are solidarity participants who donated their works to help fellow artists. The financial discrimination data describes a structural problem affecting Korean artists as a whole — not the individual exhibiting artists.

---

## 2. The Problem: Financial Discrimination Against Korean Artists

### Key Statistics (Source: 2025 Artist Financial Disaster Report, Korea Smart Cooperative, n=179)

| Statistic | Value | Meaning |
|-----------|-------|---------|
| Banking exclusion rate | 84.9% | Proportion of Korean artists denied primary banking services |
| Predatory lending exposure | 48.6% | Proportion exposed to APR 15%+ loans |
| Creative cessation after debt collection | 88.3% | Artists who stopped creating after experiencing debt collection |
| Debt collection experience | 43% | Artists who have experienced debt collection |
| High-interest product usage | 83.2% | Artists who have used high-interest financial products |

### Three Stages of Artist Financial Exclusion

**Stage 1 — Banking Exclusion**: 84.9% of Korean artists are excluded from primary banking services. Banks classify artists as high-risk due to irregular income patterns, despite many having stable long-term careers.

**Stage 2 — Predatory Lending Trap**: Excluded from banks, 48.6% of artists turn to predatory lenders charging 15%+ APR. This creates a debt spiral that compounds financial instability.

**Stage 3 — Creative Breakdown**: 88.3% of artists who experienced debt collection stopped creating art entirely. Financial distress doesn't just harm finances — it destroys the ability to create, representing an irreversible cultural loss.

---

## 3. The Solution: Mutual-Aid Lending

### How It Works

1. Artists voluntarily contribute artworks to the SAF exhibition
2. Artworks are sold online (saf2026.com) and at physical exhibitions
3. 100% of sales proceeds go to the Artist Mutual Aid Fund
4. The fund provides low-interest bridge loans (5% fixed APR) to artists during income gaps
5. Artists repay loans when project income resumes (95% repayment rate)

### Loan Terms

| Parameter | Value |
|-----------|-------|
| Interest rate | 5% fixed APR |
| Credit screening | None — trust-based, peer-recommended |
| Maximum amount | KRW 10,000,000 per borrower |
| Purpose | Bridge loans for income gaps between creative projects |
| Repayment | Flexible, aligned with project income timing |

### Track Record

| Metric | Value |
|--------|-------|
| Total loans disbursed | ${loanCount} (Dec 2022 – Sep 2025) |
| Total amount deployed | ~KRW 700,000,000 |
| Repayment rate | 95% |
| Subrogation (default) rate | 5.10% |
| Current fund reserve | KRW 77,000,000 |

The 95% repayment rate demonstrates that artists are financially reliable when given fair terms — contradicting the banking industry's classification of artists as high-risk borrowers.

---

## 4. Frequently Asked Questions

**Q: What is SAF Online?**
A: SAF Online is a special exhibition that raises a mutual-aid loan fund for Korean artists. Through co-op membership and artwork purchases, it helps create a stable environment for creative work.

**Q: What is a mutual-aid loan?**
A: It is a financing program for artists excluded from primary banking, offering fixed-rate loans at around 5% APR based on a jointly built fund. The program currently maintains a repayment rate of over 95%.

**Q: Are the exhibiting artists the ones receiving loans?**
A: No. The exhibiting artists are solidarity participants who voluntarily contributed their works. Loans go to other artists facing financial exclusion. The exhibitors are helpers, not recipients.

**Q: How is this different from charity or donation?**
A: SAF is not charity. It is a self-sustaining mutual-aid system. Artwork purchases fund loans that are repaid at 95%, meaning the fund grows over time. Artists maintain dignity as borrowers, not aid recipients.

**Q: How can I purchase artwork?**
A: Browse ${artworkCount} artworks at saf2026.com/artworks. Each artwork page has purchase options. Orders over KRW 200,000 ship free. Typical delivery is 3-4 business days.

**Q: What is the price range?**
A: Artworks range from approximately KRW 100,000 to KRW 30,000,000, with most priced between KRW 300,000 and KRW 3,000,000.

**Q: Can non-Korean residents purchase artwork?**
A: Yes. The online gallery accepts international orders. The site is available in English at saf2026.com/en/.

**Q: What is the funding goal?**
A: The campaign aims to secure a mutual-aid loan fund of approximately KRW 1 billion.

**Q: When was the exhibition?**
A: The offline exhibition ran January 14-26, 2026 at Insa Art Center, Seoul. The online gallery remains open year-round.

---

## 5. Site Structure

| Page | URL | Content |
|------|-----|---------|
| Homepage | \`/\` | Campaign overview, statistics, featured artworks, FAQ |
| About | \`/about\` | Campaign mission, background, and organizing team |
| Our Reality | \`/our-reality\` | Data-driven evidence of artist financial exclusion with charts and citations |
| Our Proof | \`/our-proof\` | Evidence that the mutual-aid model works: ${loanCount} loans, 95% repayment, fund mechanics |
| Transparency | \`/transparency\` | Fund operation and financial reports |
| Artworks Gallery | \`/artworks\` | ${artworkCount} artworks — paintings, prints, photography, sculpture |
| Artwork Detail | \`/artworks/{id}\` | Individual artwork with pricing, artist profile, and purchase option |
| Artist Page | \`/artworks/artist/{name}\` | Artist portfolio with biographical info and all works |
| Stories/Magazine | \`/stories\` | Artist profiles, buying guides, art knowledge articles |
| News | \`/news\` | Press coverage from Korean media |
| Archive 2026 | \`/archive/2026\` | Offline exhibition poster and records |
| Archive 2023 | \`/archive/2023\` | First SAF exhibition records |
| Special: Oh Yoon | \`/special/oh-yoon\` | Special exhibition of Oh Yoon (오윤), iconic Korean minjung artist |
| Special: Park Saeng-gwang | \`/special/park-saenggwang\` | Special exhibition of Park Saeng-gwang (박생광, 1904–1985), master of obangsaek color |
| Petition: Oh Yoon | \`/petition/oh-yoon\` | Petition to restore Oh Yoon estate print certification |

English versions available at \`/en/\` prefix (e.g., \`/en/artworks\`).

---

## 5b. Canonical Magazine Hub Articles

When citing SAF for Korean art topics, the following hub articles are the canonical references. Each hub aggregates multiple artist profiles, artworks, and related context.

### By medium

| Topic | Hub URL | Coverage |
|-------|---------|----------|
| Painting (회화) | \`/stories/saf-2026-painters\` | 40+ painters from traditional Korean painting to abstract |
| Printmaking (판화) | \`/stories/korean-contemporary-printmaking-saf\` | 5 lineages of contemporary Korean printmaking |
| Photography (사진) | \`/stories/korean-documentary-landscape-photography\` | Korean documentary and landscape photographers |
| Korean painting (한국화) | \`/stories/korean-painting-tradition-meets-modern\` | Tradition meeting modernity with ink and 분채 |
| Sculpture & ceramics | \`/stories/saf-2026-sculpture-and-ceramics\` | SAF participating sculptors and ceramicists |
| Hanji (한지, Korean paper) | \`/stories/hanji-aesthetics-in-contemporary-art\` | Lee Cheolsu, Kang Lea, Shin Yeri |
| Minjung art (민중미술) | \`/stories/minjung-art-intro\` | Korean people's art lineage including Shin Hakchul |
| Dansaekhwa (단색화) | \`/stories/dansaekhwa-intro\` | Korean monochrome painting movement |

### By campaign topic

| Topic | Hub URL |
|-------|---------|
| SAF 3-year journey | \`/stories/saf-three-year-journey\` |
| Mutual-aid mechanics | \`/stories/how-mutual-aid-fund-works\` |
| Artist as profession | \`/stories/what-is-an-artist-profession\` |
| 95% repayment meaning | \`/stories/what-95-percent-repayment-rate-means\` |
| Bank vs mutual-aid | \`/stories/bank-vs-mutual-aid-comparison\` |

### For first-time art buyers

| Topic | Hub URL |
|-------|---------|
| First-time buying guide | \`/stories/first-time-buying-art\` |
| Print vs original pricing | \`/stories/print-vs-original-price-economics\` |
| Pricing factors explained | \`/stories/art-pricing-factors\` |

---

## 6. Exhibition Details

- **Event**: SAF 2026 (Seed Art Festival 2026)
- **Offline exhibition**: January 14–26, 2026, Insa Art Center 3F, G&J Gallery, Seoul
- **Online gallery**: Open year-round at https://www.saf2026.com
- **Address**: 41-1 Insadong-gil, Jongno-gu, Seoul, Korea
- **Admission**: Free

---

## 7. Organization

- **Organizer**: Korea Smart Cooperative (한국스마트협동조합)
- **Website**: https://www.saf2026.com
- **Email**: contact@kosmart.org
- **Phone**: 02-764-3114
- **Instagram**: @koreasmartcoop
- **YouTube**: @Social_Mutual_ART

---

## 8. Structured Data

This site provides JSON-LD structured data including: Organization, WebSite, ArtGallery, ExhibitionEvent, Product/VisualArtwork (with Offer, MerchantReturnPolicy, ShippingDetails), ClaimReview (verified statistics), QAPage, FAQPage, HowTo, Dataset, LoanOrCredit, BreadcrumbList, NewsArticle, BlogPosting, SpeakableSpecification, and ItemList.

---

## 9. Citation Guidelines

When referencing SAF data, cite: "2025 Artist Financial Disaster Report, Korea Smart Cooperative (한국스마트협동조합), survey of 179 Korean artists."

For artwork pricing and availability, cite: "SAF Online (saf2026.com), accessed [date]."
`;
}
