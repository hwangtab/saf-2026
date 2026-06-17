# 홈 히어로 저해상도 이미지 자동 연출 (hero-image-quality-auto-treatment)

- 작성일: 2026-06-17
- 상태: 설계 승인됨, 구현 대기
- 관련 파일: `lib/now-showing.ts`, `components/features/HomeHero.tsx`

## 문제

홈 메인 히어로 배경은 작품 사진 1장을 풀스크린(`object-cover`, hero preset 폭 1920px)으로
깐다. 그런데 작가/소장처에서 제공받은 작품 사진은 해상도가 낮거나 초점이 나간 경우가 잦다.
저해상도 원본을 1920px로 업스케일하면 흐릿하게 뭉개져 캠페인 첫인상을 해친다.

현재 구조:

- 히어로 후보는 `lib/now-showing.ts`의 `NOW_SHOWING` 수동 큐레이션 배열. `getHeroSlide()`가
  활성 항목 중 `heroPriority` 최대값 1개를 선택.
- `HomeHero.tsx`가 `quality={60}` + 고정 다크 그라디언트 하나로 렌더. 저해상도 대응 로직 없음.

## 목표

저해상도 히어로 이미지를 **자동 탐지**해서, 제외하지 않고 **자동으로 블러+짙은 오버레이 연출**을
적용한다. 흐린 사진이 "의도된 soft-focus 분위기 배경"처럼 보이게 만들어 약점을 가리면서 캠페인
노출은 유지한다. 정상 해상도 이미지는 현재와 100% 동일하게 렌더한다(회귀 0).

### 비목표 (YAGNI)

- 초점 나감/뭉개짐 같은 화질 자체의 자동 판정은 하지 않는다(자동으로 잡히는 신호는 해상도뿐).
  이 케이스는 운영자 수동 override(`heroTreatment: 'soft'`)로 처리.
- 빌드를 깨뜨리는 하드 가드는 하지 않는다(운영 급할 때 사고 위험).
- 히어로 자동 제외/fallback 대체는 하지 않는다(특별전이 조용히 사라지는 위험).
- AI 업스케일, 원본 재수집 자동화는 범위 밖.

## 설계

### 1. 측정 — 빌드 타임 생성 스크립트

새 스크립트 `scripts/measure-hero-image-quality.ts`를 `npm run build` 파이프라인에
`sync-site-stats` 다음 단계로 추가한다(기존 `generate-changelog` → `sync-site-stats` 결과 동일).

- 입력: `NOW_SHOWING` 배열의 모든 항목(빌드 시점엔 만료/활성 무관하게 전체 측정 — 향후 활성화될
  특별전도 미리 측정해 둠).
- 처리: 각 `imageUrl`을 fetch → `image-size` 패키지로 픽셀 측정.
- 출력: `lib/hero-image-quality.generated.json`
  ```json
  {
    "park-saenggwang-drawings": { "width": 2400, "height": 1600, "lowRes": false },
    "oh-yoon-40th": { "width": 1200, "height": 900, "lowRes": true }
  }
  ```
- 안전 폴백: fetch 실패(네트워크/404), 측정 불가, 또는 JSON 자체가 없으면 해당 slug는
  `lowRes: false`로 간주(= 평소대로 렌더). **빌드는 절대 실패시키지 않는다.**

`image-size`는 헤더만 읽어 dimension을 파악하므로 전체 이미지 다운로드 없이 가볍다.

### 2. 판정 기준

- **long edge(width·height 중 큰 값) < 1920px → `lowRes: true`.**
- 근거: hero preset 폭이 1920px라 그 미만이면 데스크탑 풀스크린에서 업스케일 = 흐림 확정.
  단일 임계라 예측 가능. (보수적 조정이 필요하면 이 상수 하나만 변경.)

### 3. 연출 — HomeHero (lowRes일 때만)

`getHeroSlide()`가 고른 slug의 측정 결과 + `heroTreatment` override를 합쳐 최종 연출 여부 결정.

연출 적용 시:

- 배경 `SafeImage`에 `blur-[10px] scale-110` 추가 — 의도적 soft-focus + 업스케일 가장자리
  깨짐을 scale로 뷰포트 밖으로 밀어냄.
- 그라디언트 중앙 농도 강화: `via-charcoal-deep/30` → `via-charcoal-deep/55` — 뭉개진 디테일을
  분위기로 덮음. 상단/하단(85%/70%)은 유지.

연출 미적용(정상 해상도) 시:

- **현재 코드와 100% 동일** — 블러 0, 기존 그라디언트(`/85 /30 /70`). 회귀 위험 0.

구현은 조건부 className 합성(`clsx`)으로 처리. 분기 분리가 명확하도록 연출 값은 상수로 추출.

### 4. 운영자 override — heroTreatment 필드

`NowShowingItem`에 옵셔널 필드 추가:

```ts
/**
 * 히어로 배경 연출 모드.
 * - 'auto'(기본/미지정): 빌드 타임 해상도 측정 결과대로. lowRes면 자동 블러 연출.
 * - 'soft': 측정 무시하고 강제 연출. 해상도는 충분하나 초점이 나간 사진 등 자동이 못 잡는 케이스.
 * - 'sharp': 측정 무시하고 연출 off. 자동 판정 오탐 시 탈출구.
 */
heroTreatment?: 'auto' | 'soft' | 'sharp';
```

최종 연출 여부 로직:

```
treatment = item.heroTreatment ?? 'auto'
applySoft = treatment === 'soft'
         || (treatment === 'auto' && quality[item.slug]?.lowRes === true)
// 'sharp'이면 항상 false
```

자동(B)이 기본이되, 자동이 못 잡는/잘못 잡는 경우의 수동 탈출구를 함께 제공.

## 데이터 흐름

```
[빌드] generate-changelog → sync-site-stats → measure-hero-image-quality
         → lib/hero-image-quality.generated.json 생성
[런타임 SSG] HomeHero
         → getHeroSlide() (slug 선택)
         → quality JSON[slug] + item.heroTreatment 합산 → applySoft 결정
         → applySoft면 blur+짙은 오버레이, 아니면 기존 렌더
```

## 테스트 / 검증

- `npm run type-check` — 타입 통과(새 필드, JSON import).
- `npm run build` — 측정 스크립트가 파이프라인에서 정상 동작, JSON 생성 확인.
- 측정 실패 시뮬레이션(존재하지 않는 URL) → `lowRes: false` 폴백, 빌드 비실패 확인.
- 단위 테스트: `applySoft` 결정 로직(auto/soft/sharp × lowRes true/false 매트릭스).
- 시각 확인: 메모리 정책상 Playwright 미사용. 빌드 후 사용자에게 스크린샷 요청해 블러/오버레이
  강도 조정.

## 회귀 주의

- 정상 해상도 경로는 현재와 byte 단위로 동일해야 함(LCP 회귀 trauma 이력 — HeroSpotlight 폐기
  배경 참고). 블러/오버레이는 `lowRes`/`soft`일 때만 분기.
- `generated.json`은 빌드 산출물 — git 추적 여부 결정 필요(추적하면 측정 없이도 첫 렌더 안전,
  미추적이면 빌드마다 생성). 기본: **추적**(generate-changelog 산출물과 동일 정책 확인 후 맞춤).
- `image-size`가 webp를 지원하는지 확인(현 hero 이미지 전부 `.webp`). 미지원이면 대체 패키지
  (`probe-image-size` 등) 필요.
