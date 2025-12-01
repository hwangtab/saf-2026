# UI/UX 디자인 코드 리뷰 및 개선 제안

본 문서는 SAF(Seed Art Festival) 2026 웹사이트의 사용자 인터페이스(UI)와 사용자 경험(UX) 관점에서 코드베이스를 분석하고, 개선 방안을 제안합니다.

## 1. 요약

전반적으로 SAF 웹사이트는 견고한 디자인 시스템, 우수한 접근성 구현, 그리고 일관된 시각적 언어를 보여주고 있습니다. 특히 한국어 타이포그래피 처리와 색상 체계가 잘 구축되어 있으며, 반응형 디자인도 체계적으로 적용되어 있습니다.

아래는 사용자 경험, 시각적 계층, 인터랙션 디자인 관점에서 발견된 개선 기회들입니다.

---

## 2. 디자인 시스템 분석

### 강점

#### ✅ 색상 체계
- **의미론적 네이밍**: `primary`, `sun`, `sky`, `accent`, `canvas`, `charcoal` 등 직관적이고 일관된 네이밍
- **단계별 변형**: 각 색상에 `DEFAULT`, `soft`, `strong`, `surface` 등 명확한 변형 제공
- **접근성 고려**: 충분한 명도 대비를 가진 색상 선택

#### ✅ 타이포그래피
- **한글 최적화**: `GMarketSans`, `PartialSans`, `MissedSimsim` 등 한글 가독성을 고려한 폰트 선택
- **계층 구조**: 제목용 폰트(`font-jeju-stone`, `font-watermelon`)와 본문용 폰트의 명확한 구분
- **폰트 로딩 최적화**: `font-display: swap` 사용

#### ✅ 접근성 (A11y)
- Skip to main content 링크 구현
- 명확한 focus styles (:focus)
- ARIA 레이블 사용 (예: 모바일 메뉴 토글 버튼)
- Semantic HTML 사용 (`<header>`, `<nav>`, `<main>`, `<footer>`)
- 장애인 접근성 정보 명시 (전시 안내 페이지)

---

## 3. 주요 발견사항 및 개선 제안

### 1) [우선순위: 높음] 인터랙션 피드백 강화

**현재 상황:**
- CTA 버튼에 `active:scale-95` 사용으로 터치 피드백 제공
- 그러나 로딩 상태, 에러 상태 등의 시각적 피드백 부족

**문제점:**
- 외부 링크 클릭 시 (후원하기, 작품 구매하기) 페이지 전환 전까지 사용자가 클릭이 정상 작동했는지 알기 어려움
- 폼 제출이나 비동기 작업의 진행 상태를 알 수 없음

**개선 제안:**

```tsx
// components/ui/Button.tsx (신규 생성 제안)
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => Promise<void> | void;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  external?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export default function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  external = false,
  loading = false,
  disabled = false,
  className = '',
}: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (onClick && !isLoading && !disabled) {
      setIsLoading(true);
      try {
        await onClick();
      } finally {
        setIsLoading(false);
      }
    }
  };

  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200';
  
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-strong text-white',
    secondary: 'bg-gray-900 hover:bg-gray-800 text-white',
    accent: 'bg-accent hover:bg-accent-strong text-light',
  };
  
  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const content = (
    <>
      {(loading || isLoading) && (
        <motion.div
          className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {children}
    </>
  );

  const styles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${
    disabled || loading || isLoading ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
  }`;

  if (href) {
    const Component = external ? 'a' : 'a'; // Next.js Link는 외부 링크에 사용 불가
    return (
      <Component
        href={href}
        className={styles}
        {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      >
        {content}
      </Component>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading || isLoading}
      className={styles}
    >
      {content}
    </button>
  );
}
```

**기대 효과:**
- 사용자에게 즉각적인 시각적 피드백 제공
- 중복 클릭 방지
- 일관된 버튼 인터랙션 패턴

---

### 2) [우선순위: 높음] 모바일 네비게이션 UX 개선

**파일:** `components/common/Header.tsx`

**현재 상황:**
- 모바일 메뉴가 `mobileMenuOpen` 상태로 열림/닫힘 토글
- `AnimatePresence`를 사용하지 않아 닫힐 때 애니메이션 부재

**문제점:**
- 모바일 메뉴 닫힐 때 갑자기 사라져 시각적으로 부자연스러움
- 메뉴가 열렸을 때 배경 스크롤이 계속 가능하여 UX 혼란

**개선 제안:**

```tsx
// components/common/Header.tsx 개선

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EXTERNAL_LINKS } from '@/lib/constants';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // 모바일 메뉴 열릴 때 body 스크롤 비활성화
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // 페이지 전환 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // ... 기존 코드 ...

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      {/* ... 기존 nav 코드 ... */}

      {/* Mobile Menu with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            />
            
            {/* Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-80 max-w-[85%] bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
            >
              <div className="py-4 px-5 space-y-3">
                {navigation.map((item) =>
                  item.external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-3 px-4 text-base rounded-lg transition-colors border-l-4 border-transparent text-charcoal hover:bg-primary/5 hover:border-primary"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-3 px-4 text-base rounded-lg transition-colors border-l-4 ${
                        isActive(item.href)
                          ? 'text-primary font-semibold border-primary bg-primary/10'
                          : 'border-transparent text-charcoal hover:bg-primary/5 hover:border-primary'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                )}
                <a
                  href={EXTERNAL_LINKS.DONATE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full bg-accent hover:bg-accent-strong text-light font-bold px-4 py-3 rounded-lg text-center transition-colors mt-4"
                >
                  ❤️ 후원하기
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
```

**기대 효과:**
- 부드러운 슬라이드 애니메이션으로 더 나은 사용자 경험
- 메뉴 열릴 때 배경 스크롤 방지로 포커스 유지
- 오버레이 클릭으로 메뉴 닫기 가능하여 직관적인 UX

---

### 3) [우선순위: 중간] 로딩 상태 시각화

**현재 상황:**
- Dynamic import에서 간단한 로딩 placeholder 제공 (`<div className="h-96 bg-gray-100 rounded animate-pulse" />`)
- BackgroundSlider에는 이미지 로딩 상태 표시 없음

**문제점:**
- 사용자가 느린 네트워크에서 접속 시 빈 화면만 보임
- 차트나 지도 로딩 시 컨텐츠가 갑자기 나타나 레이아웃 shift 발생

**개선 제안:**

```tsx
// components/ui/SkeletonLoader.tsx (신규 생성)
'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'chart';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    rectangular: 'w-full rounded-lg',
    circular: 'rounded-full',
    chart: 'h-96 w-full rounded-lg',
  };

  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-shimmer bg-[length:200%_100%] ${variantStyles[variant]} ${className}`}
      role="status"
      aria-label="로딩 중"
    />
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-96 w-full bg-white rounded-lg p-6 space-y-4">
      <Skeleton variant="text" className="w-1/3 h-6" />
      <Skeleton variant="text" className="w-2/3 h-4" />
      <div className="h-64 flex items-end justify-around space-x-2">
        {[60, 80, 40, 90, 70, 50, 85].map((height, i) => (
          <Skeleton key={i} style={{ height: `${height}%` }} className="flex-1" />
        ))}
      </div>
    </div>
  );
}

// tailwind.config.ts에 추가
export default {
  theme: {
    extend: {
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
};
```

**사용 예시:**
```tsx
// app/our-reality/page.tsx
const FirstBankAccessChart = dynamic(
  () => import('@/components/features/StatisticsCharts').then(mod => mod.FirstBankAccessChart),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
```

**기대 효과:**
- 더 나은 인지 성능 (perceived performance)
- 레이아웃 shift 감소
- 프로페셔널한 로딩 경험

---

### 4) [우선순위: 중간] 타이포그래피 계층 개선

**현재 상황:**
- `font-jeju-stone`과 `font-watermelon`이 모두 `MissedSimsim` 폰트로 매핑됨 (중복)
- 제목 크기가 일관성 있게 적용되지만, 중간 크기 제목(h3, h4)의 시각적 계층이 약함

**문제점:**
```typescript
// tailwind.config.ts
fontFamily: {
  'watermelon': ['MissedSimsim', ...],  // 중복
  'jeju-stone': ['MissedSimsim', ...],  // 중복
}
```

**개선 제안:**

```typescript
// tailwind.config.ts
fontFamily: {
  sans: ['GMarketSans', ...],           // 본문용
  partial: ['PartialSans', ...],         // 대형 제목용 (h1)
  decorative: ['MissedSimsim', ...],     // 섹션 제목용 (h2)
},

// globals.css에 타이포그래피 유틸리티 추가
@layer utilities {
  .text-display {
    @apply font-partial text-5xl md:text-6xl lg:text-7xl leading-tight;
  }
  
  .text-headline {
    @apply font-decorative text-4xl md:text-5xl leading-snug;
  }
  
  .text-title {
    @apply font-decorative text-2xl md:text-3xl leading-normal;
  }
  
  .text-subtitle {
    @apply font-sans font-bold text-xl md:text-2xl leading-normal;
  }
  
  .text-body-large {
    @apply font-sans text-lg md:text-xl leading-relaxed;
  }
}
```

**사용 예시:**
```tsx
// Before
<h1 className="font-partial text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight">

// After
<h1 className="text-display mb-6">
```

**기대 효과:**
- 코드 중복 제거
- 일관된 타이포그래피 시스템
- 유지보수성 향상

---

### 5) [우선순위: 중간] 카드 호버 및 포커스 상태 개선

**파일:** `app/page.tsx` (Call to Action 카드)

**현재 상황:**
```tsx
className="group flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm hover:border-primary hover:shadow-xl transition-all duration-200 active:scale-95"
```

**문제점:**
- 호버 시 border와 shadow만 변경되어 변화가 미묘함
- 키보드 네비게이션 시 포커스 상태가 호버와 같아 구분이 어려움

**개선 제안:**

```tsx
// components/ui/ActionCard.tsx (신규 생성)
'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

interface ActionCardProps {
  href: string;
  external?: boolean;
  icon: string;
  title: string;
  description: string;
  linkText: string;
}

export default function ActionCard({
  href,
  external = false,
  icon,
  title,
  description,
  linkText,
}: ActionCardProps) {
  const Component = external ? motion.a : motion(Link);

  return (
    <Component
      href={href}
      {...(external && { target: '_blank', rel: 'noopener noreferrer' })}
      className="group relative flex flex-col p-8 bg-white border-2 border-gray-300 rounded-lg shadow-sm transition-all duration-300 overflow-hidden focus:outline-none focus:ring-4 focus:ring-primary/50"
      whileHover={{ y: -4, borderColor: '#2176FF' }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
        <h3 className="font-watermelon text-xl font-bold mb-3">{title}</h3>
        <p className="text-charcoal-muted mb-4 flex-grow">{description}</p>
        <span className="inline-flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all duration-300">
          {linkText}
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </Component>
  );
}
```

**기대 효과:**
- 더 명확한 인터랙티브 피드백
- 리프트 애니메이션으로 클릭 유도
- 접근성 개선 (focus ring)

---

### 6) [우선순위: 낮음] 색상 대비 미세 조정

**현재 상황:**
- 대부분의 텍스트 색상 대비는 WCAG AA 기준 충족
- 일부 보조 텍스트(`text-charcoal-muted`)와 배경 조합이 경계선

**개선 제안:**

```typescript
// tailwind.config.ts - 색상 대비 개선
colors: {
  charcoal: {
    DEFAULT: '#31393C',  // 현재
    muted: '#555E67',    // 현재: #495156 → 개선 (#555E67로 조금 더 어둡게)
    soft: '#6A7378',     // 유지
  },
}
```

**검증 방법:**
- Chrome DevTools의 Accessibility 패널 사용
- WebAIM Contrast Checker로 확인
- 목표: 모든 텍스트가 WCAG AA (4.5:1) 이상 충족

---

### 7) [우선순위: 낮음] 마이크로 인터랙션 추가

**현재 상황:**
- 기본적인 hover, active 상태만 구현
- 섹션 진입 시 애니메이션 없음

**개선 제안:**

```tsx
// components/ui/FadeInSection.tsx (신규)
'use client';

import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

interface FadeInSectionProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export default function FadeInSection({
  children,
  delay = 0,
  direction = 'up',
}: FadeInSectionProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const directionOffset = {
    up: { y: 40 },
    down: { y: -40 },
    left: { x: 40 },
    right: { x: -40 },
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...directionOffset[direction] }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**사용 예시:**
```tsx
// app/page.tsx
<FadeInSection>
  <section className="py-16 md:py-24">
    <h2>우리의 해결책</h2>
    {/* ... */}
  </section>
</FadeInSection>
```

**기대 효과:**
- 더욱 생동감 있는 사용자 경험
- 콘텐츠에 대한 주목도 향상
- 스크롤 경험 개선

---

## 4. 반응형 디자인 평가

### 강점
- ✅ Tailwind의 반응형 유틸리티 (`md:`, `lg:`) 일관되게 사용
- ✅ 모바일 우선 접근 방식
- ✅ Grid와 Flexbox 적절히 활용

### 개선 제안

#### 중간 브레이크포인트 고려
**현재:** `sm:`, `md:`, `lg:`만 주로 사용
**제안:** `xl:`, `2xl:` 브레이크포인트도 큰 화면에서 활용

```tsx
// Before
<h1 className="text-5xl md:text-6xl lg:text-7xl">

// After (초대형 화면 고려)
<h1 className="text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl">
```

---

## 5. 성능 최적화 제안

### 이미지 최적화
현재 Next.js Image 컴포넌트를 잘 사용 중이지만, 추가 제안:

```tsx
// BackgroundSlider.tsx 개선
<Image
  src={`/images/saf2023/${currentPhoto.filename}`}
  alt={currentPhoto.alt}
  fill
  className="object-cover"
  priority
  sizes="100vw"  // 추가: 적절한 이미지 크기 힌트
  quality={85}   // 추가: 품질 조정으로 파일 크기 감소
/>
```

### 폰트 로딩 최적화
**현재:** CDN에서 폰트 로드 (`cdn.jsdelivr.net`)
**제안:** Local 폰트 호스팅으로 성능 개선

```typescript
// app/layout.tsx
import localFont from 'next/font/local';

const gmarketSans = localFont({
  src: [
    { path: './fonts/GmarketSansLight.woff', weight: '300' },
    { path: './fonts/GmarketSansMedium.woff', weight: '500' },
    { path: './fonts/GmarketSansBold.woff', weight: '700' },
  ],
  variable: '--font-gmarket',
  display: 'swap',
});
```

---

## 6. 우선순위 요약

| 우선순위 | 항목 | 예상 작업 시간 | 영향도 | UX 개선도 |
|---------|------|-------------|--------|-----------|
| 🔴 높음 | 인터랙션 피드백 강화 | 2-3시간 | 높음 | ⭐⭐⭐⭐⭐ |
| 🔴 높음 | 모바일 네비게이션 개선 | 1-2시간 | 높음 | ⭐⭐⭐⭐⭐ |
| 🟡 중간 | 로딩 상태 시각화 | 2-3시간 | 중간 | ⭐⭐⭐⭐ |
| 🟡 중간 | 타이포그래피 계층 개선 | 1-2시간 | 중간 | ⭐⭐⭐ |
| 🟡 중간 | 카드 호버/포커스 개선 | 2-3시간 | 중간 | ⭐⭐⭐⭐ |
| 🟢 낮음 | 색상 대비 미세 조정 | 30분 | 낮음 | ⭐⭐⭐ |
| 🟢 낮음 | 마이크로 인터랙션 | 3-4시간 | 낮음 | ⭐⭐⭐ |

---

## 7. 컴포넌트 구조 개선 제안

### 현재 구조
```
components/
├── common/       # Header, Footer, ShareButtons
├── features/     # BackgroundSlider, Charts, Map, Video
└── ui/           # PageHero, TestimonialCard
```

### 개선된 구조 제안
```
components/
├── common/       # Header, Footer (레이아웃)
├── ui/           # 재사용 가능한 기본 UI 컴포넌트
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Skeleton.tsx
│   ├── FadeInSection.tsx
│   └── ActionCard.tsx
├── features/     # 도메인 특화 복잡한 컴포넌트
│   ├── BackgroundSlider.tsx
│   ├── Charts/
│   ├── KakaoMap.tsx
│   └── VideoEmbed.tsx
└── sections/     # 페이지 섹션 컴포넌트 (선택사항)
    ├── HeroSection.tsx
    ├── StatsSection.tsx
    └── CTASection.tsx
```

**장점:**
- 책임의 명확한 분리
- 재사용성 향상
- 테스트 용이성
- Storybook 등 문서화 도구 활용 가능

---

## 8. 디자인 토큰 시스템 구축 (장기)

현재 Tailwind config가 잘 되어 있지만, 더 체계적인 디자인 토큰 관리 제안:

```typescript
// design-tokens/tokens.ts
export const spacing = {
  section: {
    sm: 'py-12 md:py-16',
    md: 'py-12 md:py-20',
    lg: 'py-16 md:py-24',
  },
  container: 'container-max',
};

export const borders = {
  card: 'border-2 border-gray-300',
  cardHover: 'hover:border-primary',
  leftAccent: 'border-l-4 border-primary',
};

export const shadows = {
  card: 'shadow-sm hover:shadow-xl',
  elevated: 'shadow-lg',
};

// 사용 예시
<div className={`${spacing.container} ${spacing.section.md}`}>
```

---

## 9. 접근성 체크리스트

현재 구현 상태를 평가:

- [x] Keyboard navigation 지원
- [x] Focus indicators 명확
- [x] ARIA labels 사용
- [x] Semantic HTML 사용
- [x] Color contrast (대부분 준수)
- [x] Skip links
- [ ] Screen reader 테스트 필요
- [ ] 폼 에러 메시지 (해당사항 없음)
- [ ] 동영상 자막 (필요 시)

**추가 권장사항:**
- `prefers-reduced-motion` 미디어 쿼리 존중

```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 10. 결론 및 다음 단계

SAF 웹사이트는 이미 **견고한 기반**을 가지고 있습니다. 제안된 개선사항들은:

1. **즉시 적용 가능한 Quick Wins**: 모바일 메뉴 개선, 색상 대비 조정
2. **중기 개선사항**: Button 컴포넌트, 로딩 상태, 카드 인터랙션
3. **장기 구조 개선**: 컴포넌트 재구조화, 디자인 토큰 시스템

### 추천 실행 순서

**Phase 1 (1주일):**
- 모바일 네비게이션 AnimatePresence 적용
- Button 컴포넌트 생성 및 주요 CTA에 적용
- 색상 대비 미세 조정

**Phase 2 (2주일):**
- 로딩 스켈레톤 시스템 구축
- ActionCard 컴포넌트 생성
- 타이포그래피 유틸리티 정리

**Phase 3 (장기):**
- 마이크로 인터랙션 추가
- 컴포넌트 구조 재정리
- 디자인 토큰 시스템 구축

모든 변경사항은 기존 사용자 경험을 해치지 않으면서 **점진적으로** 적용하는 것을 권장합니다.
