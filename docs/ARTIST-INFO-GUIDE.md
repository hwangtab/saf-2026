# 작가 관련 정보 섹션 개발 가이드

> **작성일**: 2025-12-30  
> **대상**: 출품작 상세 페이지 (`/artworks/[id]`)

본 문서는 출품작 상세 페이지의 **작가 관련 정보 섹션**에 대한 구조, 데이터 관리, 스타일링 규칙을 설명합니다.

---

## 📁 파일 구조

```
saf/
├── content/
│   ├── saf2026-artworks.ts          # 작품 데이터 (작가 프로필, 이력 포함)
│   └── artist-articles.ts           # 작가별 관련 기사/자료 데이터
├── components/features/
│   └── RelatedArticles.tsx          # 관련 기사 카드 컴포넌트
└── app/artworks/[id]/
    └── page.tsx                     # 작품 상세 페이지
```

---

## 🎨 섹션 구성 순서

작품 상세 페이지의 우측 정보 컬럼은 다음 순서로 구성됩니다:

1. **작품 제목 & 작가명** (sticky header)
2. **작품 정보** (재료, 크기, 년도, 가격)
3. **작가 소개** (`artwork.profile` + `artwork.history`)
4. **작가 노트** (`artwork.description`)
5. **작가 관련 자료** (외부 링크 카드)

---

## 📊 데이터 구조

### 1. 작품 데이터 (`saf2026-artworks.ts`)

```typescript
interface Artwork {
  id: string;
  artist: string;
  title: string;
  // ... 기본 정보

  // 작가 관련 정보 (선택)
  profile?: string; // 작가 소개
  description?: string; // 작가 노트
  history?: string; // 주요 경력
}
```

**규칙**:

- `profile`, `description`, `history`는 **선택 필드**
- 없으면 해당 섹션이 표시되지 않음
- `\n`으로 줄바꿈 처리 (`whitespace-pre-line`)

### 2. 관련 기사 데이터 (`artist-articles.ts`)

```typescript
interface Article {
  url: string; // 외부 링크 URL
  title: string; // 기사 제목
  description: string; // 상세 설명 (2-3줄)
  source: string; // 출처명 (예: "국립현대미술관")
  thumbnail?: string; // 썸네일 (현재 미사용)
}

// 작가명을 키로 하는 Record
export const artistArticles: Record<string, Article[]> = {
  신학철: [
    /* ... */
  ],
  // 다른 작가 추가...
};
```

**규칙**:

- 작가명은 **정확히 일치**해야 함 (`artwork.artist`와 동일)
- `description`은 **구체적으로 작성** (제목만으로 부족한 정보 보완)
- 최소 3개 이상 권장

---

## 🎨 스타일링 규칙

### 섹션 제목 스타일

모든 작가 정보 섹션은 **일관된 제목 스타일** 사용:

```tsx
<h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">작가 소개</h3>
```

**예외**: 관련 기사 섹션만 큰 제목 사용

```tsx
<h2 className="font-section text-2xl font-bold text-charcoal mb-6">작가 관련 자료</h2>
```

### 카드 배경 스타일

| 섹션          | 배경 스타일                                      | 용도           |
| ------------- | ------------------------------------------------ | -------------- |
| **작가 소개** | `bg-gray-50 p-6 rounded-xl`                      | 주요 정보 강조 |
| **작가 노트** | `bg-white border border-gray-100 p-6 rounded-xl` | 부드러운 구분  |
| **관련 기사** | `bg-white border border-gray-200 p-5 rounded-lg` | 외부 링크 카드 |

### Hover 효과

관련 기사 카드만 hover 효과 적용:

```tsx
hover:border-primary hover:shadow-md transition-all duration-300
```

---

## 🔧 컴포넌트 사용법

### RelatedArticles 컴포넌트

```tsx
import RelatedArticles from '@/components/features/RelatedArticles';
import { getArticlesByArtist } from '@/content/artist-articles';

// 작가명으로 관련 기사 가져오기
const relatedArticles = getArticlesByArtist(artwork.artist);

// 렌더링 (기사가 없으면 자동으로 숨김)
<RelatedArticles articles={relatedArticles} />;
```

**특징**:

- 기사가 없으면 (`articles.length === 0`) 아무것도 렌더링하지 않음
- 외부 링크는 `target="_blank"` + `rel="noopener noreferrer"` 자동 적용
- 2열 그리드 (모바일: 1열)

---

## ✅ 새 작가 추가 체크리스트

1. **작품 데이터 추가** (`saf2026-artworks.ts`)

   ```typescript
   {
     id: "99",
     artist: "홍길동",
     profile: "작가 소개 텍스트...",
     description: "작가 노트...",
     history: "주요 경력...",
     // ...
   }
   ```

2. **관련 기사 추가** (`artist-articles.ts`)

   ```typescript
   export const artistArticles: Record<string, Article[]> = {
     // ...
     홍길동: [
       {
         url: 'https://example.com/article1',
         title: '홍길동 작가 개인전',
         description: '2024년 개인전 소개...',
         source: '갤러리명',
       },
       // 최소 3개 이상 권장
     ],
   };
   ```

3. **검증**
   ```bash
   npm run build
   ```

---

## 🚨 주의사항

### 1. 작가명 정확성

- `artwork.artist`와 `artistArticles` 키가 **정확히 일치**해야 함
- 공백, 대소문자 주의

### 2. 줄바꿈 처리

- `profile`, `description`, `history`는 `\n`으로 줄바꿈
- CSS `whitespace-pre-line` 적용됨

### 3. 선택 필드

- `profile`, `description`, `history`가 모두 없으면 해당 섹션 전체가 숨겨짐
- 최소 하나는 있어야 작가 정보 섹션이 표시됨

### 4. 외부 링크 보안

- 모든 외부 링크는 `rel="noopener noreferrer"` 필수
- `target="_blank"` 사용

---

## 📝 예시: 신학철 작가

```typescript
// content/saf2026-artworks.ts
{
  artist: "신학철",
  profile: "1943년 경북 김천 출생. 민중미술의 대표 작가...",
  history: "홍익대학교 미술대학 졸업\n국립현대미술관 소장...",
  description: "이 작품은...",
}

// content/artist-articles.ts
"신학철": [
  {
    url: "https://www.mmca.go.kr/...",
    title: "묵시 802 (1980)",
    description: "국립현대미술관 소장작. 신학철 작가의 1980년대 작품...",
    source: "국립현대미술관",
  },
  // ... 총 5개
]
```

---

## 🔗 관련 문서

- `GEMINI.md` - 프로젝트 전체 구조
- `saf2026-artworks.ts` - 작품 데이터 필드 규칙
- `CODE-REVIEW.md` - 코드 품질 가이드

---

**문서 관리자**: Claude Code (AI Assistant)  
**최종 업데이트**: 2025-12-30
