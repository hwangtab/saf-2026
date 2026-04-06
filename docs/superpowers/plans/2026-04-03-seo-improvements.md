# SAF SEO 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SEO 코드리뷰에서 발견된 Critical/Important/Suggestion 이슈를 우선순위별로 수정해 검색 노출과 소셜 공유 품질을 개선한다.

**Architecture:** Next.js 16 App Router + next-intl(ko/en) 구조. 메타데이터는 `generateMetadata()` 함수로 생성하고, JSON-LD는 `lib/schemas/` 모듈에서 생성해 `<JsonLdScript>`로 주입한다. 이미지·아이콘은 `public/` 정적 파일로 관리한다.

**Tech Stack:** Next.js 16, next-intl, TypeScript, Supabase (데이터), Vercel (배포)

---

## 파일 맵

| 파일                                        | 역할                         | 변경                               |
| ------------------------------------------- | ---------------------------- | ---------------------------------- |
| `public/images/og-image.png`                | 소셜 공유 대표 이미지        | 교체 (1200×630)                    |
| `public/images/og-image2.png`               | Organization 로고용 OG       | 교체 (1200×630)                    |
| `public/images/icons/icon-192.png`          | PWA 아이콘 192px             | 신규                               |
| `public/images/icons/icon-512.png`          | PWA 아이콘 512px             | 신규                               |
| `public/images/icons/icon-maskable-512.png` | PWA maskable 아이콘          | 신규                               |
| `public/manifest.json`                      | PWA 매니페스트               | 수정 (아이콘 PNG로 교체)           |
| `next.config.js`                            | www→non-www 리다이렉트       | 수정                               |
| `app/layout.tsx`                            | 루트 레이아웃                | 수정 (llms.txt 링크, twitter:site) |
| `lib/schemas/event.ts`                      | ExhibitionEvent JSON-LD 생성 | 수정 (EventCompleted 조건부 숨김)  |
| `app/[locale]/page.tsx`                     | 홈 페이지                    | 수정 (EventCompleted 스키마 제거)  |
| `app/[locale]/news/[id]/page.tsx`           | 뉴스 개별 기사 페이지        | 신규                               |
| `app/[locale]/news/page.tsx`                | 뉴스 목록                    | 수정 (개별 기사 링크 연결)         |
| `lib/supabase-data.ts`                      | Supabase 데이터 함수         | 수정 (`getSupabaseNewsById` 추가)  |
| `app/sitemap.ts`                            | 사이트맵                     | 수정 (뉴스 개별 URL 추가)          |

---

## Task 1: www → non-www 301 리다이렉트

**Files:**

- Modify: `next.config.js`

**Context:** `SITE_URL = 'https://www.saf2026.com'`이 정규 URL이다. `saf2026.com`(non-www)으로 접근 시 301로 www로 보내야 검색엔진 PageRank 분산을 막는다.

- [ ] **Step 1: next.config.js에 `async redirects()` 추가**

`next.config.js`의 `const nextConfig = { ... }` 객체 안에 `async headers()` 바로 위에 추가:

```js
async redirects() {
  return [
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'saf2026.com' }],
      destination: 'https://www.saf2026.com/:path*',
      permanent: true,
    },
  ]
},
```

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add next.config.js
git commit -m "fix(seo): add www canonical redirect for saf2026.com"
```

---

## Task 2: OG 이미지 1200×630px 교체

**Files:**

- Replace: `public/images/og-image.png` (현재 800×450 JPEG → 1200×630 PNG/JPEG)
- Replace: `public/images/og-image2.png` (현재 800×400 → 1200×630)

**Context:** Facebook/카카오톡/Google은 OG 이미지를 최소 1200×630px로 요구한다. 현재 파일이 미달이라 흐릿하게 표시된다. `lib/constants.ts`의 `OG_IMAGE.width/height`는 이미 1200×630으로 선언되어 있으므로 코드 변경 없이 이미지 파일만 교체한다.

- [ ] **Step 1: 새 OG 이미지 파일 준비**

디자인 툴(Figma, Canva 등)에서 1200×630px 규격으로 다음 두 파일 제작:

- `og-image.png` — 씨앗페 온라인 메인 대표 이미지
- `og-image2.png` — 조직/로고 이미지 (Organization 스키마에서 사용)

파일 형식: PNG 또는 JPEG, 파일 크기 300KB 이하 권장.

- [ ] **Step 2: 파일 교체**

```bash
# 기존 파일 백업 후 교체
cp public/images/og-image.png public/images/og-image.png.bak
cp public/images/og-image2.png public/images/og-image2.png.bak
# 새 파일을 같은 경로에 저장 후:
python3 -c "
from PIL import Image
img = Image.open('public/images/og-image.png')
print('og-image size:', img.size)  # 반드시 (1200, 630)
img2 = Image.open('public/images/og-image2.png')
print('og-image2 size:', img2.size)  # 반드시 (1200, 630)
"
```

Expected output:

```
og-image size: (1200, 630)
og-image2 size: (1200, 630)
```

- [ ] **Step 3: 커밋**

```bash
git add public/images/og-image.png public/images/og-image2.png
git commit -m "fix(seo): replace OG images with 1200x630px spec-compliant versions"
```

---

## Task 3: PWA 아이콘 PNG 교체 및 maskable 추가

**Files:**

- Create: `public/images/icons/icon-192.png`
- Create: `public/images/icons/icon-512.png`
- Create: `public/images/icons/icon-maskable-512.png`
- Modify: `public/manifest.json`
- Modify: `app/layout.tsx`

**Context:** 현재 manifest.json이 `favicon.ico`를 192×192/512×512로 선언하고 있으나 ICO는 PWA 아이콘으로 부적합하다. PNG 파일로 교체하고 `maskable` purpose 아이콘을 추가한다.

- [ ] **Step 1: PNG 아이콘 파일 준비**

`public/images/logo/saf-logo.png`(1191×842)를 기반으로 다음 파일 생성:

```bash
# sharp CLI 또는 ImageMagick 사용:
# icon-192.png: 192×192 정사각형 (safe zone 고려해 중앙 크롭 or 패딩)
# icon-512.png: 512×512 정사각형
# icon-maskable-512.png: 512×512, 배경색(#FF5A5F) 채운 maskable 버전
#
# Node.js sharp 사용 예:
node -e "
const sharp = require('sharp');
sharp('public/images/logo/saf-logo.png')
  .resize(192, 192, { fit: 'contain', background: '#ffffff' })
  .toFile('public/images/icons/icon-192.png', console.log);
sharp('public/images/logo/saf-logo.png')
  .resize(512, 512, { fit: 'contain', background: '#ffffff' })
  .toFile('public/images/icons/icon-512.png', console.log);
sharp('public/images/logo/saf-logo.png')
  .resize(512, 512, { fit: 'contain', background: '#FF5A5F' })
  .toFile('public/images/icons/icon-maskable-512.png', console.log);
"
```

- [ ] **Step 2: manifest.json 수정**

`public/manifest.json`을 다음으로 교체:

```json
{
  "name": "씨앗페 온라인",
  "short_name": "씨앗페",
  "description": "한국 예술인들의 상호부조 기금 마련을 위한 특별전",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FF5A5F",
  "icons": [
    {
      "src": "/images/icons/icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "/images/icons/icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any"
    },
    {
      "src": "/images/icons/icon-maskable-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
```

- [ ] **Step 3: app/layout.tsx — apple-touch-icon 및 llms.txt 정리**

`app/layout.tsx`의 `<head>` 블록 수정:

```tsx
// 수정 전
<link rel="alternate" type="text/plain" title="LLM instructions" href="/llms.txt" />

// 수정 후: rel="alternate"는 언어 대안 문서용이므로 llms.txt에는 부적합. 제거.
// (llms.txt 자체는 유지하되 HTML head에서 링크 제거)
```

`metadata` 객체의 `icons` 항목도 업데이트:

```tsx
icons: {
  icon: '/favicon.ico',
  apple: '/images/icons/icon-192.png',
},
```

- [ ] **Step 4: 빌드 검증**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add public/manifest.json public/images/icons/ app/layout.tsx
git commit -m "fix(seo): replace PWA icons with PNG, add maskable icon, remove invalid llms.txt link"
```

---

## Task 4: twitter:site 전역 메타데이터 추가

**Files:**

- Modify: `app/layout.tsx`

**Context:** `SOCIAL_LINKS.TWITTER = 'https://twitter.com/saf2026'`가 이미 상수로 존재한다. `twitter.site`를 추가하면 Twitter 카드에 계정 태그가 표시되어 신뢰도 향상.

- [ ] **Step 1: app/layout.tsx의 metadata 객체 수정**

`twitter` 항목에 `site` 추가:

```tsx
twitter: {
  card: 'summary_large_image',
  site: '@saf2026',
  title: '씨앗페 온라인',
  description: '한국 예술인들의 상호부조 기금 마련을 위한 특별전',
  images: [OG_IMAGE.url],
},
```

- [ ] **Step 2: 빌드 검증**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 3: 커밋**

```bash
git add app/layout.tsx
git commit -m "fix(seo): add twitter:site tag to global metadata"
```

---

## Task 5: EventCompleted 스키마 홈페이지에서 제거

**Files:**

- Modify: `lib/schemas/event.ts`
- Modify: `app/[locale]/page.tsx`

**Context:** 전시가 2026-01-26 종료되어 현재 `EventCompleted` 상태이다. 홈(`app/[locale]/page.tsx`)에서 종료된 이벤트 스키마를 계속 노출하면 검색엔진이 현재 진행 중인 사이트로 오해할 수 없어 오히려 불이익 가능성. `archive/2026/page.tsx`는 아카이브 목적이므로 유지한다.

- [ ] **Step 1: `lib/schemas/event.ts`에 종료 여부 반환 추가**

`generateExhibitionSchema` 함수 상단에 helper 상수 추가:

```ts
export const isExhibitionCompleted = (): boolean => {
  return Date.now() > Date.parse('2026-01-26T19:00:00+09:00');
};
```

- [ ] **Step 2: `app/[locale]/page.tsx`에서 조건부 렌더링**

```tsx
// 파일 상단 import에 추가
import { generateExhibitionSchema, isExhibitionCompleted } from '@/lib/seo-utils';

// JSX 내 JsonLdScript 부분 수정:
// 수정 전
<JsonLdScript data={generateExhibitionSchema([], locale)} />;

// 수정 후
{
  !isExhibitionCompleted() && <JsonLdScript data={generateExhibitionSchema([], locale)} />;
}
```

- [ ] **Step 3: seo-utils.ts에서 re-export 추가**

`lib/seo-utils.ts`에 `isExhibitionCompleted` re-export 추가:

```ts
export { isExhibitionCompleted } from './schemas/event';
```

- [ ] **Step 4: 빌드 검증**

```bash
npm run build
```

Expected: 에러 없이 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add lib/schemas/event.ts lib/seo-utils.ts app/\[locale\]/page.tsx
git commit -m "fix(seo): hide EventCompleted schema from homepage, keep in archive"
```

---

## Task 6: 뉴스 개별 기사 동적 라우트 신규 생성

**Files:**

- Modify: `lib/supabase-data.ts` — `getSupabaseNewsById` 함수 추가
- Create: `app/[locale]/news/[id]/page.tsx` — 기사 상세 페이지
- Modify: `app/[locale]/news/page.tsx` — 목록에서 상세 링크 연결
- Modify: `app/sitemap.ts` — 뉴스 개별 URL 추가

**Context:** `NewsArticle` 타입: `{ id, title, source, date, link, thumbnail?, description? }`. `getSupabaseNews()`는 전체 목록을 반환한다. 개별 기사에 canonical URL과 `NewsArticle` JSON-LD를 부여하기 위해 `/news/[id]` 라우트를 추가한다.

- [ ] **Step 1: `lib/supabase-data.ts`에 `getSupabaseNewsById` 추가**

`getSupabaseNews` 함수 아래에 추가:

```ts
export const getSupabaseNewsById = cache(async (id: string): Promise<NewsArticle | null> => {
  const allNews = await getSupabaseNews();
  return allNews.find((article) => article.id === id) ?? null;
});
```

- [ ] **Step 2: `app/[locale]/news/[id]/page.tsx` 생성**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { getSupabaseNews, getSupabaseNewsById } from '@/lib/supabase-data';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { generateNewsArticleSchema, createBreadcrumbSchema } from '@/lib/seo-utils';
import { buildLocaleUrl, createLocaleAlternates } from '@/lib/locale-alternates';
import { SITE_URL, OG_IMAGE, CONTACT } from '@/lib/constants';
import { resolveLocale } from '@/lib/server-locale';
import SafeImage from '@/components/common/SafeImage';
import Section from '@/components/ui/Section';
import PageHero from '@/components/ui/PageHero';
import { Link } from '@/i18n/navigation';

export const revalidate = 300;

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const news = await getSupabaseNews();
  return news.map((article) => ({ id: article.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = resolveLocale(await getLocale());
  const article = await getSupabaseNewsById(id);

  if (!article) return { title: 'Not Found' };

  const path = `/news/${article.id}`;
  const pageUrl = buildLocaleUrl(path, locale);
  const description = article.description || `${article.source} · ${article.date}`;

  return {
    title: article.title,
    description,
    alternates: createLocaleAlternates(path, locale),
    openGraph: {
      title: article.title,
      description,
      url: pageUrl,
      type: 'article',
      publishedTime: article.date,
      authors: [article.source],
      images: article.thumbnail
        ? [{ url: article.thumbnail, width: 1200, height: 630, alt: article.title }]
        : [
            {
              url: OG_IMAGE.url,
              width: OG_IMAGE.width,
              height: OG_IMAGE.height,
              alt: OG_IMAGE.alt,
            },
          ],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
    },
  };
}

export default async function NewsArticlePage({ params }: Props) {
  const { id } = await params;
  const locale = resolveLocale(await getLocale());
  const [article, t] = await Promise.all([getSupabaseNewsById(id), getTranslations('newsPage')]);

  if (!article) notFound();

  const articleSchema = generateNewsArticleSchema({
    headline: article.title,
    description: article.description || '',
    datePublished: article.date,
    dateModified: article.date,
    authorName: article.source,
    publisherName: CONTACT.ORGANIZATION_NAME,
    publisherLogoUrl: `${SITE_URL}/images/logo/saf-logo.png`,
    imageUrl: article.thumbnail || OG_IMAGE.url,
    url: buildLocaleUrl(`/news/${article.id}`, locale),
  });

  const breadcrumbSchema = createBreadcrumbSchema([
    { name: locale === 'en' ? 'Home' : '홈', url: SITE_URL },
    { name: locale === 'en' ? 'News' : '언론 보도', url: buildLocaleUrl('/news', locale) },
    { name: article.title, url: buildLocaleUrl(`/news/${article.id}`, locale) },
  ]);

  return (
    <>
      <JsonLdScript data={[articleSchema, breadcrumbSchema]} />
      <PageHero title={article.title} description={`${article.source} · ${article.date}`} />
      <Section>
        <div className="max-w-3xl mx-auto">
          {article.thumbnail && (
            <div className="relative w-full aspect-video mb-8 rounded overflow-hidden">
              <SafeImage
                src={article.thumbnail}
                alt={article.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          {article.description && (
            <p className="text-lg leading-relaxed mb-8">{article.description}</p>
          )}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-primary text-white rounded hover:opacity-90 transition"
          >
            {locale === 'en' ? 'Read original article' : '원문 기사 보기'}
          </a>
          <div className="mt-8">
            <Link href="/news" className="text-sm text-muted hover:underline">
              ← {locale === 'en' ? 'Back to News' : '언론 보도 목록으로'}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
```

- [ ] **Step 3: `lib/schemas/content.ts`에서 `generateNewsArticleSchema` 시그니처 확인 후 맞추기**

```bash
grep -n "generateNewsArticleSchema\|NewsArticleSchemaInput" lib/schemas/content.ts | head -10
```

`NewsArticleSchemaInput` 타입과 파라미터 이름이 위 코드와 다르면 맞게 수정한다. 타입 오류가 있으면:

```bash
npm run type-check 2>&1 | grep "news"
```

- [ ] **Step 4: `app/[locale]/news/page.tsx` 뉴스 목록에 상세 링크 추가**

뉴스 목록에서 기사 제목/썸네일에 `/news/${article.id}` 내부 링크를 추가한다. 기존 외부 링크(`article.link`)와 함께 내부 링크도 제공:

```tsx
// 기사 카드 제목 부분 수정 (기존 외부 링크를 내부 라우트로 변경)
import { Link } from '@/i18n/navigation'

// 기존:
<a href={article.link} target="_blank" rel="noopener noreferrer">{article.title}</a>

// 수정: 내부 링크 → 상세 페이지 → 상세 페이지에서 원문 링크 제공
<Link href={`/news/${article.id}`}>{article.title}</Link>
```

> 주의: `news/page.tsx`는 420줄 이상이므로 기사 카드 컴포넌트 렌더링 부분만 찾아 수정한다. `article.link`를 직접 `<a>`로 렌더링하는 패턴을 찾아 교체.

- [ ] **Step 5: `app/sitemap.ts`에 뉴스 개별 URL 추가**

`sitemap.ts`의 `export default async function sitemap()` 상단의 데이터 fetch에 뉴스 추가:

```ts
// 상단 import에 추가
import { getSupabaseArtworks, getSupabaseNews } from '@/lib/supabase-data';

// 함수 내부 데이터 fetch 부분:
const [allArtworks, allNews] = await Promise.all([getSupabaseArtworks(), getSupabaseNews()]);
```

그리고 return 직전에 뉴스 페이지 배열 추가:

```ts
const newsPages: MetadataRoute.Sitemap = allNews.flatMap((article) =>
  routing.locales.map((locale) => ({
    url: localizedUrl(baseUrl, `/news/${article.id}`, locale),
    lastModified: new Date(article.date),
    changeFrequency: 'yearly' as const,
    priority: locale === routing.defaultLocale ? 0.6 : 0.54,
    alternates: createAlternates(baseUrl, `/news/${article.id}`),
  }))
);

return [...staticPages, ...artworkPages, ...artistPages, ...newsPages];
```

- [ ] **Step 6: 타입 체크 및 빌드 검증**

```bash
npm run type-check 2>&1
npm run build 2>&1 | tail -10
```

Expected: 타입 오류 0, 빌드 성공.

- [ ] **Step 7: 커밋**

```bash
git add lib/supabase-data.ts \
        "app/[locale]/news/[id]/page.tsx" \
        "app/[locale]/news/page.tsx" \
        app/sitemap.ts
git commit -m "feat(seo): add news article detail pages with NewsArticle JSON-LD and sitemap entries"
```

---

## Task 7: 최종 검증

- [ ] **Step 1: 전체 타입 체크**

```bash
npm run type-check
```

Expected: 출력 없음 (오류 0).

- [ ] **Step 2: 전체 빌드**

```bash
npm run build
```

Expected: 에러 없이 빌드 완료, `sitemap.xml` 생성 확인.

- [ ] **Step 3: 사이트맵 뉴스 URL 포함 확인**

```bash
# 빌드 후 정적 sitemap 출력물에 /news/ 경로 포함 확인
# 또는 dev 서버 기동 후:
curl -s http://localhost:3000/sitemap.xml | grep "/news/" | head -5
```

Expected: `/news/[id]` 형태 URL이 ko/en 양쪽으로 존재.

- [ ] **Step 4: OG 태그 확인**

```bash
curl -s http://localhost:3000 | grep -E "og:image|twitter:image" | head -5
```

Expected: `content="https://www.saf2026.com/images/og-image.png"` 형태.

- [ ] **Step 5: robots.txt 확인**

```bash
curl -s http://localhost:3000/robots.txt
```

Expected: `sitemap: https://www.saf2026.com/sitemap.xml` 포함.

- [ ] **Step 6: 최종 커밋 (변경사항이 있다면)**

```bash
git add -A
git commit -m "fix(seo): final verification fixes"
```

---

## 작업 우선순위 요약

| 우선순위 | Task                         | 예상 효과                            |
| -------- | ---------------------------- | ------------------------------------ |
| 1        | Task 1 (www 리다이렉트)      | PageRank 분산 방지, canonical 정규화 |
| 2        | Task 2 (OG 이미지)           | 소셜 공유 썸네일 즉시 개선           |
| 3        | Task 5 (EventCompleted 제거) | 홈 JSON-LD 품질 향상                 |
| 4        | Task 6 (뉴스 라우트)         | 기사 개별 색인 → 검색 노출 증가      |
| 5        | Task 3 (PWA 아이콘)          | Lighthouse PWA 점수 개선             |
| 6        | Task 4 (twitter:site)        | Twitter 카드 신뢰도 소폭 향상        |
