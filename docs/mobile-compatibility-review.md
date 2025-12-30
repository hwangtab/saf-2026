# 모바일 호환성 코드 리뷰

> 리뷰 날짜: 2025-12-30
> 대상: SAF 2026 웹사이트

## 요약

전반적으로 모바일 우선(Mobile-First) 설계가 잘 적용되어 있으나, Safe Area Insets 미적용 및 터치 타겟 크기 부족 등 일부 개선이 필요합니다.

| 영역 | 상태 | 심각도 |
|------|------|--------|
| Viewport 메타 태그 | 양호 | - |
| 반응형 Breakpoints | 양호 | - |
| 모바일 네비게이션 | 양호 | - |
| 터치 타겟 크기 | 수정 필요 | Medium |
| 폰트 크기 | 양호 | - |
| 이미지 처리 | 우수 | - |
| 가로 스크롤 | 잠재적 문제 | Medium |
| Safe Area Insets | 미적용 | **Critical** |
| 폼 입력 필드 | 경미한 이슈 | Low |
| 고정/스티키 요소 | 수정 필요 | Medium |

---

## Critical 이슈

### 1. Safe Area Insets 미적용

**설명**: iPhone X 이상의 노치(Notch) 및 홈 인디케이터 영역을 고려하지 않아 콘텐츠가 가려질 수 있음.

#### 영향받는 파일

**`app/layout.tsx`**
```tsx
// 현재
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2176FF',
};

// 수정 필요
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2176FF',
  viewportFit: 'cover', // 추가
};
```

**`components/common/Header.tsx` (라인 88-91)**
```tsx
// 현재
<header className={`fixed top-0 left-0 right-0 z-50 ...`}>

// 수정 필요
<header className={`fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] ...`}>
```

**`components/common/Footer.tsx`**
```tsx
// 현재
<footer className="bg-gray-900 text-white">

// 수정 필요
<footer className="bg-gray-900 text-white pb-[env(safe-area-inset-bottom)]">
```

**`components/common/Header.tsx` 모바일 메뉴 패널 (라인 192-198)**
```tsx
// 현재
<motion.div className="fixed top-16 right-0 bottom-0 w-80 ...">

// 수정 필요
<motion.div
  className="fixed top-16 right-0 w-80 ..."
  style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
>
```

---

## Medium 이슈

### 2. 터치 타겟 크기 부족

**권장 최소 크기**: 44x44px (Apple Human Interface Guidelines)

#### 영향받는 파일

**`components/common/Header.tsx` (라인 147-152)** - 모바일 메뉴 버튼
```tsx
// 현재: p-2 (약 40x40px)
<button className={`lg:hidden p-2 ...`}>

// 수정 필요
<button className={`lg:hidden p-3 min-w-[44px] min-h-[44px] ...`}>
```

**`components/common/ShareButtons.tsx` (라인 122-129)** - 카카오 공유 버튼
```tsx
// 현재: w-8 h-8 (32x32px)
<button className="w-8 h-8 flex items-center justify-center ...">

// 수정 필요
<button className="min-w-[44px] min-h-[44px] flex items-center justify-center ...">
```

**`components/features/MasonryGallery.tsx` (라인 80-88)** - 작가 버튼
```tsx
// 현재
<button className="px-2 py-1.5 text-xs sm:text-sm ...">

// 수정 필요
<button className="px-3 py-2 min-h-[44px] text-sm ...">
```

### 3. 가로 스크롤 가능성

**`components/features/MasonryGallery.tsx` (라인 78-79)** - 작가 네비게이션
```tsx
// 현재: 고정 그리드 (작가 많으면 오버플로우)
<div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2 px-4">

// 수정 필요
<div className="flex flex-wrap gap-2 px-4">
```

**`components/features/StatisticsCharts.tsx` (라인 92-96)** - Y축 너비
```tsx
// 현재: 좁은 화면에서 문제 발생 가능
<YAxis dataKey="reason" type="category" width={120} />

// 수정 필요
<YAxis dataKey="reason" type="category" width={100} tick={{ fontSize: 11 }} />
```

### 4. Sticky 요소 Safe Area 미고려

**`components/features/MasonryGallery.tsx` (라인 77-78)**
```tsx
// 현재
<div className="sticky top-16 z-30 ...">

// 수정 필요
<div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 ...">
```

---

## Low 이슈

### 5. iOS 자동 줌 방지

**설명**: iOS Safari는 16px 미만 폰트의 input 필드에 포커스 시 자동으로 줌합니다.

**`components/features/SearchBar.tsx` (라인 32-38)**
```tsx
// 현재
<input className="... sm:text-sm ...">

// 수정 필요 (모바일에서 text-base 유지)
<input className="... text-base sm:text-sm ...">
```

---

## 잘 구현된 부분

### Viewport 메타 태그
`app/layout.tsx`에서 올바르게 설정됨.

### 모바일 네비게이션
- 스크롤 잠금(scroll lock) 구현됨
- 부드러운 애니메이션 적용
- 오버레이 클릭으로 메뉴 닫기 지원

### 이미지 처리
Next.js `<Image>` 컴포넌트를 올바르게 사용하고 responsive `sizes` 속성 적용됨.

```tsx
<Image
  src={...}
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

### 반응형 Breakpoints
Tailwind CSS 모바일 우선 breakpoint가 일관되게 사용됨:
- 기본: 모바일
- `sm:` (640px+)
- `md:` (768px+)
- `lg:` (1024px+)

---

## 수정 우선순위

1. **Priority 1 (Critical)**: Safe Area Insets 적용
2. **Priority 2 (High)**: 터치 타겟 크기 증가
3. **Priority 3 (Medium)**: 가로 스크롤 방지
4. **Priority 4 (Low)**: iOS 자동 줌 방지
