# SAF 2026 프로젝트 종합 코드리뷰 보고서

> **검토 일자**: 2026-05-08  
> **검토 범위**: 보안 취약점, 렌더링 성능, 웹 접근성(WCAG 2.1), 코드 가독성/유지보수성, 기술 스택 모범 사례

---

## 📑 목차 (Table of Contents)

1. [📋 개요](#개요)
2. [🚨 우선순위별 문제점 및 개선 제안](#우선순위별-문제점-및-개선-제안)
   - [🔴 Critical (즉시 수정 필요)](#critical-즉시-수정-필요)
   - [🟠 High (조속한 수정 권장)](#high-조속한-수정-권장)
   - [🟡 Medium (개선 권장)](#medium-개선-권장)
   - [🟢 Low (참고 사항)](#low-참고-사항)
3. [⭐ 재사용 가능한 우수 코드 사례](#재사용-가능한-우수-코드-사례)
4. [📊 종합 평가](#종합-평가)
5. [🎯 권장 실행 계획](#권장-실행-계획)

---

## 📋 개요

| 항목           | 내용                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| **프로젝트**   | SAF 2026 (씨앗 아트 페스티벌 2026 웹 플랫폼)                                               |
| **기술 스택**  | Next.js 14+ (App Router), TypeScript, Tailwind CSS, Supabase, Vercel                       |
| **검토 범위**  | 보안 취약점, 렌더링 성능, 웹 접근성(WCAG 2.1), 코드 가독성/유지보수성, 기술 스택 모범 사례 |
| **검토 일자**  | 2026-05-08                                                                                 |
| **총 이슈 수** | Critical 3건, High 9건, Medium 11건, Low (우수 사례 및 접근성 준수)                        |

---

## 🚨 우선순위별 문제점 및 개선 제안

### 🔴 Critical (즉시 수정 필요 - 총 3건)

> ⚠️ **이 섹션의 문제들은 애플리케이션의 핵심 기능에 영향을 미치므로 최우선 수정이 필요합니다.**

#### 1. 미들웨어 파일명 불일치

- **문제**: Next.js는 루트 디렉토리의 `middleware.ts` 파일만 인식하나, 현재 `proxy.ts`로 작성됨
- **위치**: [`proxy.ts`](proxy.ts)
- **영향**: 미들웨어가 로드되지 않아 인증 세션 갱신, 리다이렉트, i18n 라우팅 작동 안 함
- **개선 제안**:

```bash
# 파일 이름 변경
mv proxy.ts middleware.ts
```

#### 2. 미들웨어 내보내기 패턴 오류

- **문제**: `export async function proxy()`로 정의되어 있으나 Next.js는 `export default` 또는 `export function middleware()` 형태 요구
- **위치**: [`proxy.ts:45`](proxy.ts:45)
- **개선 제안**:

```typescript
// Before
export async function proxy(request: NextRequest) {
  // ...
}

// After
export default async function middleware(request: NextRequest) {
  // ...
}
```

#### 3. Import 순서 규칙 위반

- **문제**: React import가 외부 패키지 뒤에 위치 (프로젝트 규칙: 1. React/Next, 2. External, 3. Internal, 4. Types)
- **위치**: [`components/common/MarkdownRenderer.tsx:1-9`](components/common/MarkdownRenderer.tsx:1-9)
- **개선 제안**:

```typescript
// Before
import { someExternalLib } from 'external-lib';
import React from 'react';
import { InternalComponent } from '@/components/internal';

// After (프로젝트 규칙 준수)
import React from 'react';
import { someExternalLib } from 'external-lib';
import { InternalComponent } from '@/components/internal';
```

---

### 🟠 High (조속한 수정 권장 - 총 9건)

#### 보안 (3건)

**1. 미들웨어에서 인가 검증 부재**

- **위치**: [`proxy.ts:85-87`](proxy.ts:85-87)
- **문제**: 모든 인가 검증이 서버 액션 내 가드 함수에 의존, 새 액션 추가 시 누락 위험
- **제안**: 중요 API/액션 인가 검증 일관성 확인 가이드라인 추가

```typescript
// 권장 패턴: 서버 액션 진입점에 일관된 가드 적용
'use server';
export async function someAction() {
  const auth = await requireAdmin(); // 일관된 가드 패턴
  if (!auth.success) return auth;
  // ...
}
```

**2. Rate Limiting의 인메모리 폴백 한계**

- **위치**: [`lib/rate-limit.ts:23-41`](lib/rate-limit.ts:23-41)
- **문제**: Vercel 서버리스 환경에서 여러 인스턴스 실행 시 분산 rate limiting 보장 안 됨
- **제안**: Supabase RPC 기반 모니터링 강화 또는 Redis 도입 검토

**3. JSON-LD 스크립트 XSS 이론적 가능성**

- **위치**: [`components/common/JsonLdScript.tsx:7-16`](components/common/JsonLdScript.tsx:7-16)
- **문제**: `dangerouslySetInnerHTML` 사용, 사용자 입력이 JSON-LD에 포함될 경우 위험
- **제안**: `escapeJsonLdForScript()` 전체 특수문자 처리 검증 및 보강

```typescript
// 권장: JSON-LD 이스케이프 함수 강화
function escapeJsonLdForScript(jsonLd: object): string {
  const json = JSON.stringify(jsonLd);
  // <, >, &, ' 등 특수문자 이스케이프
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/'/g, '\\u0027');
}
```

#### 성능 (1건)

**4. 대형 라이브러리 번들 영향**

- **문제**: three.js, recharts 등이 주요 페이지 번들에 영향 줄 가능성
- **제안**: `ANALYZE=true npm run build`로 번들 분석 후 동적 임포트 적용

```bash
# 번들 분석 실행
ANALYZE=true npm run build
```

```typescript
// 권장: 동적 임포트 적용
import dynamic from 'next/dynamic';

const ChartComponent = dynamic(() => import('@/components/Chart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false
});
```

#### 코드 가독성 (3건)

**5. 하드코딩된 색상 사용**

- **위치**: [`components/features/ArtworkPurchaseCTA.tsx:165,201`](components/features/ArtworkPurchaseCTA.tsx:165)
- **문제**: `BRAND_COLORS` 토큰 대신 하드코딩된 rgba 값 사용
- **제안**: `shadow-primary-soft/15` 등 Tailwind 클래스로 대체

```typescript
// Before
style={{ boxShadow: '0 4px 12px rgba(46, 125, 50, 0.15)' }}

// After (BRAND_COLORS 토큰 활용)
className="shadow-[0_4px_12px_rgba(46,125,50,0.15)]"
// 또는 tailwind.config.ts에 정의된 경우
className="shadow-primary-soft/15"
```

**6. CSS Modules와 Tailwind 혼용**

- **위치**: [`components/common/Header/FullscreenMenu.module.css`](components/common/Header/FullscreenMenu.module.css)
- **문제**: 프로젝트 규칙(Tailwind 우선) 위반
- **제안**: Tailwind 유틸리티 클래스로 전환

**7. `console.log` 남용**

- **위치**: [`lib/artwork-legacy-map.ts:69-71`](lib/artwork-legacy-map.ts:69-71)
- **문제**: ESLint 규칙(`no-console` warn) 위반
- **제안**: `console.warn`으로 변경 또는 `lib/notify.ts` 시스템 활용

```typescript
// Before
console.log('Legacy map:', data);

// After
import { notify } from '@/lib/notify';
notify.warn('Legacy map loaded', { data });
```

#### 기술 스택 (2건)

**8. Server Component에서 `any` 타입 사용**

- **위치**: [`app/(portal)/admin/artworks/page.tsx:32`](<app/(portal)/admin/artworks/page.tsx:32>) 등
- **문제**: 타입 안정성 저하
- **제안**: Supabase 생성 타입 또는 `types/index.ts` 인터페이스 사용

```typescript
// Before
const data: any = await supabase.from('artworks').select('*');

// After
import { Database } from '@/types/database.types';
type Artwork = Database['public']['Tables']['artworks']['Row'];

const { data, error } = await supabase.from('artworks').select('*').returns<Artwork[]>();
```

**9. 테스트 외 파일에서 `any` 타입 사용**

- **위치**: [`components/common/WebVitalsTracker.tsx:44`](components/common/WebVitalsTracker.tsx:44)
- **제안**: `unknown[]` 또는 구체적 타입 사용

```typescript
// Before
const metrics: any[] = [];

// After
interface WebVitalMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}
const metrics: WebVitalMetric[] = [];
```

---

### 🟡 Medium (개선 권장 - 총 11건)

#### 보안 (1건)

**10. 이메일 검증 정규식 단순함**

- **위치**: [`lib/utils/input-validation.ts:29-36`](lib/utils/input-validation.ts:29-36)
- **제안**: 엄격한 검증 라이브러리 도입 검토

```typescript
// 권장: validator.js 또는 zod 활용
import validator from 'validator';
const isValidEmail = validator.isEmail(email);
```

#### 성능 (3건)

**11. Supabase 조인 시 불필요한 artist 컬럼 전송 최소화**

```typescript
// Before
const { data } = await supabase.from('artworks').select('*, artist(*)'); // bio, history 등 불필요한 데이터 포함

// After
const { data } = await supabase.from('artworks').select('*, artist(id, name, profile_image_url)'); // 필요한 컬럼만 선택
```

**12. 원격 이미지에 Next.js Image 컴포넌트 사용 검토**

- **위치**: [`components/features/ArtworkImage.tsx`](components/features/ArtworkImage.tsx)
- **제안**: `next/image` 사용으로 최적화

**13. `WebVitalsTracker` 실제 작동 여부 확인**

- **제안**: 분석 도구 연동 상태 및 이벤트 발송 로그 확인

#### 코드 가독성 (3건)

**14. Admin 에러/로딩 페이지의 불필요한 `'use client'` 제거**

```typescript
// Server Component인 경우 'use client' 지시어 제거
// app/(portal)/admin/error.tsx 등에서 확인
```

**15. 일부 파일의 Import 순서 불일치 수정**

- **제안**: ESLint `sort-imports` 규칙 적용 또는 Prettier import 정렬 플러그인 사용

**16. `types/index.ts`와 `types/database.types.ts` 타입 중복 모니터링**

- **제안**: 타입 정의 통합 또는 명확한 역할 분담

#### 기술 스택 (4건)

**17. `unstable_cache` 태그 기반 무효화 일치화**

- **위치**: [`lib/supabase-data.ts`](lib/supabase-data.ts)
- **제안**: 캐시 태그 명명 규칙 수립 및 일관된 무효화 로직 구현

**18. 동적 라우트(`/artworks/[id]` 등)에 `generateStaticParams` 구현**

```typescript
// app/(portal)/artworks/[id]/page.tsx
export async function generateStaticParams() {
  const { data: artworks } = await supabase.from('artworks').select('id');

  return artworks?.map(({ id }) => ({ id })) ?? [];
}
```

**19. 모든 Server Action이 일관된 `ActionState` 타입 반환하도록 통일**

```typescript
// types/actions.ts
export type ActionState = {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: Record<string, string[]>;
};
```

**20. 빌드 시점 환경 변수 검증 로직 추가**

```typescript
// lib/env-validation.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  // ...
});

export const env = envSchema.parse(process.env);
```

---

### 🟢 Low (참고 사항 - 웹 접근성 포함)

#### 웹 접근성 (WCAG 2.1)

✅ **준수 사항**:

- 이미지 대체 텍스트 제공
- 시맨틱 HTML 구조 사용
- 키보드 접근성 기본 지원
- `scripts/check-color-contrast.ts` 도구를 통한 명도 대비 검증 체계 존재
- `eslint.config.mjs`에서 `jsx-a11y/*` 규칙 철저히 적용

#### 기타 우수 사례

| 영역          | 내용                                                                       |
| ------------- | -------------------------------------------------------------------------- |
| **보안**      | 웹훅 검증(`lib/integrations/toss/webhook.ts`), CSP 설정, 텍스트 새니타이저 |
| **성능**      | Vercel Image Optimization, ISR/캐싱 전략, React Hooks 최적화               |
| **코드**      | `lib/colors.ts` 색상 시스템, `lib/notify.ts` 에러 처리                     |
| **기술 스택** | RLS 정책, Tailwind 브랜드 시스템, 인증 로직 분리                           |

---

## ⭐ 재사용 가능한 우수 코드 사례

### 1. 디자인 시스템 및 색상 관리

**위치**: [`lib/colors.ts`](lib/colors.ts), [`tailwind.config.ts`](tailwind.config.ts)

```typescript
// lib/colors.ts - 타입 안정성을 갖춘 색상 토큰
export const BRAND_COLORS = {
  primary: '#2E7D32',
  secondary: '#1565C0',
  // ...
} as const;

// WCAG AA 대비율 검증 완료된 브랜드 색상 토큰 체계
// as const 활용으로 타입 안정성 확보
```

### 2. 인증 및 보안 시스템

**위치**: [`lib/auth/`](lib/auth/) 디렉토리

- 클라이언트/서버/미들웨어 인증 로직 명확히 분리
- Service Role 키 사용 시 `requireAdmin()` 검증 필수화

### 3. 데이터 페칭 및 캐싱

**위치**: [`lib/supabase-data.ts`](lib/supabase-data.ts)

```typescript
// cache() + unstable_cache() 조합으로 중복 요청 방지
// 태그 기반 캐시 무효화 체계
export async function getArtworks() {
  return cache(async () => {
    return unstable_cache(
      async () => {
        /* fetch data */
      },
      ['artworks'],
      { tags: ['artworks'], revalidate: 3600 }
    )();
  })();
}
```

### 4. 유틸리티 훅 및 컴포넌트

**위치**: [`lib/hooks/useArtworkFilter.ts`](lib/hooks/useArtworkFilter.ts), [`components/common/SafeImage.tsx`](components/common/SafeImage.tsx)

- 상세 JSDoc 문서화, URL 동기화, 디바운싱 적용
- Supabase URL 자동 변환, 깨진 이미지 fallback 처리

### 5. 일관된 에러 처리

**위치**: [`lib/notify.ts`](lib/notify.ts)

```typescript
// LEVEL_CONFIG를 통한 일관된 알림 색상/이모지 관리
// 환경 변수 누락 시 안전한 no-op 처리
```

---

## 📊 종합 평가

SAF 2026 프로젝트는 **전반적으로 매우 잘 구성된 Next.js 기반 웹 플랫폼**입니다. 특히 다음 영역에서 우수성이 돋보입니다:

### ✅ 강점

| 영역              | 평가                                                                |
| ----------------- | ------------------------------------------------------------------- |
| **디자인 시스템** | WCAG AA 대비율 검증 완료된 브랜드 색상 토큰 체계                    |
| **인증 구조**     | 클라이언트/서버/미들웨어 인증 로직의 명확한 분리                    |
| **캐싱 전략**     | `cache()` + `unstable_cache()` 조합으로 효율적 데이터 관리          |
| **보안 기본**     | 웹훅 검증, CSP 설정, 텍스트 새니타이저 등 보안 베스트 프랙티스 적용 |
| **접근성**        | `jsx-a11y/*` 규칙 적용, 명도 대비 검증 체계 구축                    |

### ⚠️ 개선 필요 영역

1. **미들웨어 설정 오류 (Critical)** - 즉시 수정 필요
2. **`any` 타입 사용 최소화** - 타입 안정성 강화
3. **대형 라이브러리 번들 영향도** - 동적 임포트 적용 검토
4. **코드 규칙 준수 일관성** - Import 순서, 색상 토큰 사용

### 📈 이슈 심각도 분포

```
Critical (즉시): ██████░░░░ 3건
High (조속):     ██████████ 9건
Medium (권장):   ████████████████ 11건
Low (참고):      우수 사례 및 접근성 준수 확인됨
```

---

## 🎯 권장 실행 계획 (우선순위 순)

### Phase 1: Critical Fixes (즉시)

1. **[Critical]** `proxy.ts` → `middleware.ts`로 이름 변경 및 내보내기 패턴 수정
   ```bash
   git mv proxy.ts middleware.ts
   ```
2. **[Critical]** `MarkdownRenderer.tsx` Import 순서 수정

### Phase 2: High Priority (1-2주 내)

3. **[High]** Server Component/Action의 `any` 타입을 구체적 타입으로 교체
4. **[High]** 하드코딩된 색상 제거 및 `BRAND_COLORS` 토큰 사용 통일
5. **[High]** Rate Limiting 분산 환경 대응 검토

### Phase 3: Medium Priority (1개월 내)

6. **[Medium]** 번들 분석 실행 및 불필요한 라이브러리 최적화
   ```bash
   ANALYZE=true npm run build
   ```
7. **[Medium]** `unstable_cache` 태그 관리 체계 정비
8. **[Medium]** 동적 라우트에 `generateStaticParams` 구현

### 지속적 개선 사항

- Import 순서 규칙 자동화 (ESLint/Prettier)
- 타입 커버리지 모니터링
- 번들 크기 CI 체크 도입

---

## 📝 결론

SAF 2026 프로젝트는 현대적인 Next.js 기술 스택과 체계적인 디자인 시스템을 갖춘 우수한 플랫폼입니다. **Critical 이슈 3건에 대한 즉시 수정**과 **타입 안정성 강화**를 최우선으로 진행한다면, 더욱 견고하고 유지보수하기 쉬운 코드베이스가 될 것입니다.

---

_본 보고서는 2026-05-08에 작성되었으며, 제공된 하위 검토 결과를 종합하여 작성되었습니다._
