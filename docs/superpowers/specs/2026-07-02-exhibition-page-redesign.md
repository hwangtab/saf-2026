# 오윤 테라코타 기금마련전 — 공개 페이지 재설계 (다크 편집형)

- 작성일: 2026-07-02
- 상태: 설계 확정 (구현)
- 대상: `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx` 전면 재설계
- 대체: Task 16(petition 원문 verbatim 재사용) 접근 폐기 — 사용자 지시로 **새 카피 + 파격 전시 UI**

## 배경 & 목표

기존 페이지는 "히어로 2줄 + 작품 그리드"로 밋밋했고, petition 원문을 그대로 붙였다. 사용자 지시:

1. **원문 재사용 ❌ → 전시에 걸맞은 새롭고 품질 높은 카피를 새로 쓴다.** 사실(1974 구의동, 8월 철거, 40주기 등)은 정확히, 문장은 새롭게.
2. **밋밋한 UI ❌ → 기금마련전다운 멋지고 파격적인 다크 편집형 전시 UI.**

**감정 톤(확정): 비장한 다크 — 소실 위기의 유물을 구하다.** 전체를 하나의 어두운 전시장처럼: full-bleed charcoal, 대형 타이포, 챕터별 스크롤 몰입.

## 제약 (하드)

- **브랜드 토큰만** (DESIGN.md Gallery White Cube + 다크 챕터 어휘). `slate-*`·Tailwind 기본 팔레트 금지. 배경 다크는 `bg-charcoal`/`charcoal-deep`, 텍스트 강조는 `text-sun`(숫자·시한)·`text-primary-strong`. `bg-sun`/`bg-accent` 금지.
- **WCAG AA**: 다크 위 흰 텍스트(charcoal 배경 11.79:1↑), 작은 텍스트 대비 준수. CTA는 `Button`/`LinkButton variant`.
- **사실 정확 · 날조 금지**: 통계·인물·인용 지어내지 않기. 사실 출처 = petition.ohYoon 콘텐츠(1974 구의동 양면 테라코타 부조, 오윤 1946–1986, 400여 작품, 옥관문화훈장 2005, 국현 회고전 2006, 올봄 건물 매각, 8월 초 해체 마지노선, 40주기, 우리은행→매수인→유족→한국스마트협동조합 반출동의). **문장은 전부 새로 작성**하되 이 사실 범위 안에서.
- **프레이밍**: 출품 작가 = 자발적 연대자(불우한 대출거부 피해자 아님). 수익 = **오윤 테라코타 이전 기금**(청원의 상호부조 대출 기금과 **구분**).
- **i18n**: 공개 라우트 → `exhibitionOhYoonTerracotta` 네임스페이스에 새 카피 키 ko/en **대칭**. 한국어 리터럴 직접 사용 금지. `force-static` + `getTranslations({locale})` 유지.
- **이미지**: `SafeImage`만. 재사용 자산 = `/images/petition-oh-yoon/mural-1|2|3.webp`(실재 확인), `/images/ohyoon.webp`.
- **SEO 유지**: Task 13이 넣은 `createStandardPageMetadata`(OG·hreflang) + breadcrumb JSON-LD 유지/보강.
- **발견성 유지**: 헤더·푸터·홈·청원·추도식 인바운드 링크(이미 main)·sitemap 그대로.

## 시각 어휘 (기존 거장 특별전에서 재사용)

- full-bleed `bg-charcoal` 다크 챕터, `border-b-8 border-double border-white/10` 구분.
- 대형 h1 `text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-balance drop-shadow-sm`.
- 대형 blockquote: `border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)]` + primary 원형 따옴표.
- `border-l-[12px]` 섹션 헤더, eyebrow `text-[10px]/text-eyebrow font-semibold tracking-widest uppercase text-primary-strong`(다크 위엔 `text-sun`/`text-white/60`).
- 시한·숫자 강조: `tabular-nums`, `text-sun`.
- 워터마크 텍스트: `text-white/5 -z-10 select-none`.
- glass 박스: `bg-white/5 border border-white/20 backdrop-blur-sm`.
- 지층 라인·회전 라벨·코너 스트로크(절제).
- `SawtoothDivider` 챕터 전환, 안전 패딩 상수 준수.
- 갤러리: `MasterArtistGallery`(dark theme, 기존).

## 페이지 구조 (6 챕터)

### ① 히어로 — 벽이 사라지기 전에

full-bleed charcoal + 테라코타 사진 배경(어두운 오버레이 `from-black/70 via-black/45 to-black/70`) + 미세 지층 라인. eyebrow "오윤 40주기 · 테라코타 기금마련전". 대형 h1. 리드 1문단. 하단 SawtoothDivider.

### ② 챕터 1 — 한 노동자가 벽에 새긴 것 (유물)

대형 blockquote("미술은 많은 사람이 나누어야 한다. — 오윤" — 이 인용은 실제 오윤 어록이므로 그대로 사용). 테라코타 사진 3장(정면/디테일/반대면) + 큐레이터 캡션. 새 카피 1–2문단(1974 제작 배경).

### ③ 챕터 2 — 50년, 그리고 8월 (위기 · 시한)

다크. `border-l-[12px]` 헤더 + 대형 시한 강조(sun, tabular-nums). 위기 서사 1문단 + 시한 3항목(건물 매각 / 8월 초 해체 마지노선 / 40주기). 긴박감.

### ④ 챕터 3 — 동료들이 답하다 (연대 · 기금 메커니즘)

톤 전환(canvas 밝은 챕터 or 부드러운 다크). "작가들이 벽을 든다" + 3스텝(작가가 작품을 내놓다 → 시민이 작품을 사다 → 수익이 **테라코타 이전 기금**이 되다). CTA 2: 직접 후원하기(/funding/oh-yoon-terracotta) · 벽화 지키기 청원(/petition/oh-yoon).

### ⑤ 출품작 갤러리 (다크)

`bg-charcoal` full-bleed + 워터마크 + `MasterArtistGallery`(dark). 태그작 0이면 품격 있는 emptyState.

### ⑥ 클로징

모뉴멘털 한 줄 + 최종 CTA("벽을 옮기는 일에 당신의 이름을 더해주세요").

## 카피 (신규 · ko — en은 대칭 번역)

> 실제 구현 시 아래를 i18n 키로. 문장은 새로 작성, 사실은 위 범위 내.

- `heroEyebrow`: "오윤 40주기 · 테라코타 기금마련전"
- `heroTitle`: "50년을 견딘 벽,\n이제 우리 차례입니다"
- `heroLead`: "1974년, 스물여덟의 오윤이 구의동 은행 벽에 새긴 양면 테라코타 부조. 올여름 건물과 함께 철거를 앞두고 있습니다. 동료 작가들이 작품을 내놓아, 그 벽을 시민의 품으로 옮깁니다."
- `ch1Eyebrow`: "유물", `ch1Title`: "한 노동자가 벽에 새긴 것"
- `ch1Quote`: "미술은 많은 사람이 나누어야 한다.", `ch1QuoteBy`: "— 오윤"
- `ch1Body`: "군대에서 얻은 병으로 제대한 청년은 경주의 전돌 공장에서 흙을 만지고 있었습니다. 1974년, 그는 상업은행 구의동지점 벽에 양면 부조를 새깁니다. 노동자였던 이가, 노동자들이 매일 드나드는 자리에 남긴 벽. 청년 작가에게 공공미술이 좀처럼 허락되지 않던 시대의 드문 기록입니다."
- `ch2Eyebrow`: "위기", `ch2Title`: "50년, 그리고 8월"
- `ch2Body`: "올봄 건물이 팔렸습니다. 늦어도 8월 초까지 벽을 해체해 옮기지 못하면, 반세기를 버틴 부조는 영영 사라집니다. 하필 오윤 40주기. 지금이 아니면 다시 시민의 손으로 되찾을 수 없습니다."
- `ch2Deadline1/2/3`: "올봄 — 건물 매각" / "8월 초 — 해체 마지노선" / "2026 — 오윤 40주기"
- `ch3Eyebrow`: "연대", `ch3Title`: "작가들이 벽을 듭니다"
- `ch3Body`: "떠난 거장의 벽을, 오늘의 동료 작가들이 자기 작품으로 지탱합니다."
- `ch3Step1/2/3`: "작가가 작품을 내놓습니다" / "시민이 작품을 만납니다" / "판매 수익이 테라코타 이전 기금이 됩니다"
- `galleryTitle`: "출품작", `galleryEmpty`: "곧, 동료 작가들의 작품이 이 자리에 걸립니다."
- `closingLine`: "벽을 옮기는 일에, 당신의 이름을 더해주세요."
- CTA: `fundingCta`("직접 후원하기"), `petitionCta`("벽화 지키기 청원") — 기존 키 재사용 가능.

## 컴포넌트/파일

- `app/[locale]/exhibition/oh-yoon-terracotta/page.tsx` — 전면 재작성(서버, force-static, getTranslations).
- 챕터가 길면 `app/[locale]/exhibition/oh-yoon-terracotta/_components/`로 분리(예: `TerracottaHero`, `TerracottaStory`, `TerracottaUrgency`, `SolidarityMechanism`). 파일 비대화 방지.
- `messages/*.json` `exhibitionOhYoonTerracotta` 네임스페이스: Task 13 SEO 키 유지 + 위 신규 카피 키 추가. Task 16이 넣은 `storyConnect*`·petition 재사용은 제거/대체.

## 검증

- `npm run type-check` · `npm run build`(양 locale SSG, i18n placeholder OK).
- a11y: 기존 `e2e/a11y/exhibition-oh-yoon-terracotta.spec.ts` 유지(다크 배경 대비 위반 없게).
- 시각 확인: 사용자(Playwright 금지).

## 범위 밖

- 참여 화면(`/dashboard/fundraiser`) 재설계 — 별도(사용자 결정 시).
- 실시간 카운트다운 타이머 — 정적 시한 표기로 충분(YAGNI).
