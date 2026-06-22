# 오윤 클러스터 내부링크 통합 — 설계 명세

**날짜:** 2026-06-22
**브랜치:** `seo/oh-yoon-cluster-internal-links`
**근거 데이터:** 2026-06-22 GSC·GA4 분석 + [[project_seo_conversion_audit_2026_06]] (06-20 감사)

## 배경

2026-06-22 GSC/GA4 분석 결과, 코드로 움직일 수 있는 유일한 SEO 윈은 **오윤(Oh Yoon) 클러스터 내부링크 통합**으로 재확인됨. 단, 탐색 결과 "정규허브 통합" 자체는 **이미 완료** 상태:

- 정규허브 = `/artworks/artist/오윤` (`OhYoonFeature.tsx`, bilingual self-canonical)
- `/special/oh-yoon` → 갤러리 308 redirect 정상 (`next.config.js` 150–158)
- canonical·redirect·sitemap 모두 정상

**진짜 갭은 5개 오윤 자산 간의 내부링크 비대칭이다.** 현재 링크 매트릭스:

| 출발 → 도착                                           | 갤러리(허브) | 추도식 | 청원   | 스토리 |
| ----------------------------------------------------- | ------------ | ------ | ------ | ------ |
| **갤러리** (`OhYoonFeature.tsx`)                      | —            | ❌     | ❌     | ✅ 5개 |
| **추도식** (`/event/oh-yoon-memorial`, GA4 2위 599PV) | ❌           | —      | ❌     | ❌     |
| **청원** (`/petition/oh-yoon`)                        | ✅ 4회       | ❌     | ✅ 2개 | —      |

가장 큰 누수: **추도식 페이지는 GA4 트래픽 2위(599PV)인데 다른 오윤 자산으로 링크가 0인 dead-end.** 행사 관심자가 작품·청원·이야기 퍼널로 전혀 흐르지 않음.

## 목표

5개 오윤 자산을 양방향으로 엮어 ① Google이 topical cluster로 인식하도록 internal link equity를 허브로 모으고, ② 추도식 방문자를 작품·청원 퍼널로 흐르게 한다. **SEO + 전환 이중 윈.**

비목표(범위 밖, 명시적 제외):

- 새 페이지/새 라우트 생성 — 하지 않음 (허브는 이미 존재)
- canonical·redirect·sitemap 변경 — 하지 않음 (이미 정상)
- 청원 retention 섹션의 기존 한국어 리터럴 → i18n 전환 리팩터 — 하지 않음 (scope creep)
- 스토리 본문 콘텐츠 수정 — 하지 않음

## 변경 사항 (3건)

### A. 추도식 페이지에 retention 섹션 신규 (최우선)

**파일:** `app/[locale]/event/oh-yoon-memorial/page.tsx` (현 157줄)

- **위치:** 정보 Section들(127–152) 뒤, 마지막 어두운 그라디언트 CTA `<section>`(155~) **앞**. 신청 CTA(`id="apply"`, 104)보다 한참 아래라 행사 전(7/5) 신청 전환을 방해하지 않음.
- **카드 5장 → 링크 대상:**
  - `/artworks/artist/오윤` (갤러리 허브)
  - `/petition/oh-yoon` (청원)
  - `/stories/oh-yun-40th-anniversary` (40주기 헌정)
  - `/stories/oh-yun-song-of-the-blade` (칼노래 — GSC 3위 클릭됨)
  - `/stories/oh-yoon-estate-print-guide` (사후판화 가이드)
- **카드 마크업:** 청원 retention 카드 패턴 복제 — `block rounded-2xl border border-gallery-hairline bg-canvas-soft p-5 hover:bg-canvas-strong transition-colors`, 내부 `text-eyebrow text-primary-strong` 라벨 + `text-charcoal-deep` 제목. 그리드 `grid-cols-1 md:grid-cols-2 gap-4`.
- **i18n:** 이 페이지는 `getTranslations({ locale, namespace: 'event.ohYoonMemorial' })` 기반이므로 **i18n 키로 작성**. `messages/ko.json`·`messages/en.json`의 `event.ohYoonMemorial`에 `relatedHub` 하위 키(heading, intro, 카드별 eyebrow/title) 추가. ko/en 짝 필수(`verify:i18n-placeholders`가 build에서 검사).

### B. 갤러리 허브(OhYoonFeature)에 추도식·청원 링크 추가

**파일:** `components/special/master-artists/OhYoonFeature.tsx` (현 780줄)

- **위치:** "함께 읽을 매거진" `<section>`(723~) 내부, 매거진 카드 ul **위** 또는 헤더 직후에 "오윤 더 알아보기" 링크 2장(추도식·청원) 배치. 허브가 스토리뿐 아니라 추도식·청원까지 가리켜 클러스터를 완성.
- **링크 대상:** `/event/oh-yoon-memorial`, `/petition/oh-yoon`
- **카피:** 이 파일 스타일을 따라 `isEnglish ? 'English' : '한국어'` 삼항 인라인 (파일이 본문 카피에 next-intl 메시지가 아닌 삼항 인라인을 씀 — surrounding code 일관성).
- 추도식은 행사 라이브(2026-07-05)라 "추도식 함께하기" 성격, 청원은 "서명 동참" 성격.

### C. 청원 retention 섹션에 추도식 카드 1장 추가

**파일:** `app/[locale]/petition/oh-yoon/page.tsx` (retention 그리드 706–772)

- 기존 retention 그리드에 `/event/oh-yoon-memorial` 카드 1장 추가.
- **카피:** 기존 청원 retention 섹션이 한국어 리터럴 패턴이므로 **동일하게 리터럴**(surrounding code 일관성). i18n 전환은 범위 밖.

## 원칙

- 기존 카드/섹션 패턴 재사용. 새 공용 컴포넌트 인라인 제작 금지([[feedback_reuse_standard_components]]).
- 색상 토큰: `gallery-hairline`, `canvas-soft`, `canvas-strong`, `text-charcoal-deep`, `text-primary-strong` — 기존 retention 카드와 동일 토큰만(브랜드 토큰 규칙 준수).
- redirect/canonical/sitemap 불변.
- 추도식 retention은 신청 CTA 하단 배치(전환 방해 0).

## 검증

- `npm run type-check` — strict 통과
- `npm run lint`
- `npm run build` — SSG 호환 + `verify:i18n-placeholders`(ko/en 키 짝) 통과
- 기존 테스트 영향 없음 확인: `__tests__/lib/page-header-clearance.test.ts`(추도식 페이지 섹션 추가는 루트 클리어런스 불변), `hero-routes` 무관
- 시각 확인은 사용자에게 요청([[feedback_no_playwright]] — Playwright/스크린샷 자동화 금지)

## 영향 자산 요약

| 파일                                                  | 변경                                          |
| ----------------------------------------------------- | --------------------------------------------- |
| `app/[locale]/event/oh-yoon-memorial/page.tsx`        | retention 섹션 추가 (변경 A)                  |
| `components/special/master-artists/OhYoonFeature.tsx` | 추도식·청원 링크 2장 (변경 B)                 |
| `app/[locale]/petition/oh-yoon/page.tsx`              | 추도식 카드 1장 (변경 C)                      |
| `messages/ko.json`, `messages/en.json`                | `event.ohYoonMemorial.relatedHub` 키 (변경 A) |
