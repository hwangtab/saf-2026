# Critical CSS POC 재분석 + 권장안 (2026-05-11)

> 측정 기준: 2026-05-11 PSI 모바일 (https://saf2026.com 홈)
> LCP 4.1 ~ 5.2s (Poor) · render-blocking CSS 17KB + 28KB 두 chunk가 FCP ~700ms 잠식
> POC 자산 경로 (main repo): `/Users/hwang-gyeongha/saf-2026/tmp/critical-poc/`

---

## 1. 5/6 POC 재해석

### 1-1. POC 산출물에서 실제로 확인된 사실 (확실)

| 항목                              | 값                                                         |
| --------------------------------- | ---------------------------------------------------------- |
| 홈 HTML before                    | 670,841 B (`home.before.html`)                             |
| 홈 HTML after                     | 705,281 B (`home.after.html`)                              |
| 외부 CSS chunk 4개 (before)       | 합계 459,884 B (459KB)                                     |
| `inline <style>` 새로 들어간 양   | **35,056 B (단일 블록)** + 기존 2 블록 (616 B)             |
| chunk 구성                        | 328,827 B + 88,014 B + 448 B + 359 B                       |
| 14KiB 첫 패킷 fit                 | **❌ `fitsInFirstPacket14KiB: false`**                     |
| after에 외부 `<link>` 4개         | 그대로 남아 있음 (async swap 패턴 흔적은 HTML에 없음)      |
| POC 도구 (`extract-critical-css`) | revert로 삭제됨 (`scripts/build-css.mjs`, `beasties` 의존) |

### 1-2. 4개 CSS chunk 정체 (확실)

- **`0u5ilbjmewam3.css` (328,827 B)** — `head` 첫 1,500 B 샘플로 확인: 시작이 `@font-face{font-family:Noto Sans KR;…}` 로 `next/font` Noto Sans KR subset 50+ 묶음. 그 뒤에 Tailwind utility 전체 + brand 토큰. 폰트 face 정의가 차지하는 비중이 크지만(추정 ~50KB 이상, **추정**), 본문은 Tailwind utility 묶음으로 보임.
- **`02cpdoif8jddz.css` (88,014 B)** — `::backdrop{--tw-*: …}` 로 시작. Tailwind preflight + reset + 일부 utility 라인. CSS Modules 컴포넌트 chunk와 합쳐진 형태로 추정 (**추정**).
- **`04ujsdv5tk176.css` (448 B)** — `FullscreenMenu` CSS Module (확인됨, 헤더의 모바일 메뉴 dialog 전용).
- **`12wh1_h_kzwua.css` (359 B)** — `GlobalSearchDialog` CSS Module (확인됨).

→ **현재 진단 메시지의 "17KB + 28KB"는 gzip 후 사이즈로 보임**(unzipped 88KB·329KB ≈ gzip 28KB·17KB 정도 대응). 추측 (**추정**).

### 1-3. 35KB inline 블록 구성 (확실)

`home.after.html` 의 35KB inline 블록을 sample 한 결과:

```
[head]   brand custom properties (:root vars)
         Tailwind preflight reset (*::before, ::after)
         Tailwind 기본 utility 묶음 …
[tail]   FullscreenMenu CSS Module rules
         GlobalSearchDialog CSS Module rules
```

→ **above-the-fold만 추출**한 결과가 아님. **4개 외부 chunk 중 `04ujsdv5tk176.css`(448 B) + `12wh1_h_kzwua.css`(359 B) 전부 + Tailwind preflight + utility 첫 묶음**을 통째로 inline. 이 35KB는 hero 영역 selector 한정 추출이 아니라 사실상 "beasties default critical 추출" 결과.

### 1-4. 7c·74·eb 커밋이 알려주는 진짜 회귀 사유 (확실)

```
07c6ad1a perf(css): Tailwind 컴파일 분리 + 외부 CSS 링크 — render-blocking 해제 1단계
74327005 perf(css): Critical inline + async load 2단계 — render-blocking 670ms 제거 시도
eb1e8e3f revert(perf/css): 1단계도 되돌림 — 2단계 회귀 후 dead complexity 정리
```

revert 커밋 본문이 결정적 단서를 제공:

> 2단계(critical inline + async load)가 preview 측정에서 **FCP +2725ms / LCP +599ms 회귀**로 폐기

POC report.json 의 `fitsInFirstPacket14KiB: false` 는 표면적 회귀 사유였고, **실제 preview 측정에서는 14KB 미달이 문제가 아니라 패턴 자체가 추가 회귀**(FCP 2.7s 악화)를 만들었음. 가능한 원인:

- `<link rel="stylesheet" media="print" onLoad="this.media='all'">` 패턴이 **Next.js 16 RSC streaming + React 19** 환경에서 stylesheet flush 타이밍과 충돌(SSR streaming HTML이 도착하는 동안 print stylesheet로 paint → onLoad 발화 → media swap → 전면 reflow). **추정**.
- 또는 `<link rel="preload" as="style" fetchPriority="high">` 와 stylesheet swap이 Next 자체 link hoisting과 중복 발화. **추정**.
- 회귀의 정확한 원인은 5/6 preview HAR/trace 가 남아있지 않아 단정 불가. 다음 시도 시 **반드시 preview에서 측정 후 main 머지**.

### 1-5. 14KB 첫 패킷 안에 above-the-fold만 넣는 게 가능한가? (추정)

대략 산식:

- **Header + 1차 hero 텍스트 + 첫 5 utility 그룹** → 약 6 ~ 8KB 예상
- 다만 Tailwind preflight `*,::before,::after { --tw-* : … }` selector 만으로 **이미 ~1KB**. 화면 표시 어떤 요소에도 적용되므로 preflight 제거는 불가.
- brand 토큰 (`:root{--color-*}`) ~ 0.5KB
- font 토큰 매핑 ~ 0.1KB
- 헤더 layout + nav + logo 관련 utility ~ 3KB
- Hero (PageHero/HeroSpotlight) 관련 utility ~ 3 ~ 5KB

→ **타이트하지만 12 ~ 14KB 가능성 있음**(추정). 단, beasties 기본 추출은 33KB 결과를 냈으므로 **custom 추출 또는 manual whitelisting 필요**.

---

## 2. 현재 상태 확인 (확실)

- `app/[locale]/layout.tsx:21` 에서 `import '@/styles/globals.css'` 직접 import → Next.js 자동 CSS splitting 유지
- `tailwind.config.ts` content: `./app/**`, `./components/**` 만 스캔 → JIT/purge 정상 동작 중
- `styles/globals.css` 350줄. `@tailwind base/components/utilities` + 마크다운/curator label custom layer
- POC 도구 (`scripts/extract-critical-css.mjs`, `scripts/build-css.mjs`, `beasties`) **모두 삭제됨** — 재시도 시 다시 작성 필요
- 5/6 이후 회귀 fix 누적: `0dd19a73` icn1 region (TTFB 850→200ms), `4b6966b8` PageHero svh+transform-gpu (CLS), `89dff52a` NowShowing sizes 등 — **render-blocking CSS 자체엔 변화 없음**

---

## 3. 옵션별 평가

### (a) POC 재실행 + above-the-fold 한정 부분 inline (14KB 목표)

| 항목      | 평가                                                                                 |
| --------- | ------------------------------------------------------------------------------------ |
| 가능성    | 중간 — beasties default 33KB에서 hero-only manual whitelist로 ~12KB 가능 (**추정**) |
| 회귀 위험 | **높음** — 5/6 시도가 FCP +2725ms 회귀, 동일 패턴 재시도면 같은 함정 가능           |
| 작업량    | 2 ~ 3일 (추출 스크립트 재작성 + manual selector 큐레이션 + visual regression)        |
| ROI       | **낮음** — render-blocking 670ms 회수가 목표인데 회귀 위험이 동등 이상              |

### (b) Tailwind purge 강화 + JIT 옵션 재검토

| 항목      | 평가                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------- |
| 가능성    | 낮음 — content scope 이미 `app/**` + `components/**` 로 최소화. JIT는 Tailwind 3 이후 default ON     |
| 효과      | typography plugin은 이미 제거됨 (globals.css 주석). 추가 절감 여지 작음                              |
| ROI       | **매우 낮음** — 큰 절감 기대 어려움. Tailwind 4 migration 시 별도 검토(번들 사이즈 30~50% 절감 가능) |

### (c) `<style>` 인라인 + `media="print" onLoad` async swap 패턴 재시도

| 항목      | 평가                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| 가능성    | 낮음 — **5/6 정확히 이 패턴이 FCP +2725ms 회귀로 실패**                                                              |
| 회귀 위험 | **확정적으로 높음** — 동일 패턴이면 동일 결과 가능성 큼                                                              |
| 차별점    | 회귀의 정확한 원인 trace 없이는 패턴만 동일 재시도는 무의미. 원인 분석(stylesheet flush 타이밍) 선행 필요             |
| ROI       | **낮음** — 원인 trace 없는 재시도 = 도박                                                                              |

### (d) "다른 작업(chunk 통합 등)이 끝나길 기다리고 critical CSS 작업은 불필요" 결론

| 항목      | 평가                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| 가능성    | **높음** — 다른 에이전트가 HeroSpotlight·next.config·로고 동시 손대고 있다고 명시됨                                |
| 검증 필요 | 그 작업이 chunk 통합/축소로 render-blocking 자체를 줄이면 critical CSS 별도 작업 불필요                              |
| 시점      | 그 작업 끝난 후 PSI 재측정으로 검증                                                                                  |
| ROI       | **현 시점 가장 안전** — 회귀 0 / 추가 작업 0                                                                         |

### (e) 더 좋은 접근 후보

대안 1. **`next/font` 의 Noto Sans KR subset을 latin/korean(common 1, 2)만 preload**해 329KB chunk의 font face 정의 비중 자체를 줄이기:

- 현재 329KB chunk 첫 1.5KB 샘플로 **Noto Sans KR subset 50+ unicode-range** 가 확인됨. korean common 1·2·hangul-syllables 외 보통 사이트엔 불필요한 한자 영역(U+F900-, U+FF00- 등)이 다수 포함.
- 추정 절감: 329KB → 200KB 정도 (font face 정의 130KB 절감, gzip 후 약 5-8KB). render-blocking CSS 자체는 그대로지만 다운로드 시간 단축. **추정**.
- 검증 비용 낮음 — `next/font` import 옵션만 조정.

대안 2. **`globals.css` 의 `markdown-content` 스타일을 별도 chunk로 분리** (markdown 노출 페이지 한정 import). 홈에는 markdown 없음.

- 현재 `globals.css` 350줄 중 markdown 관련 ~80줄(추정 ~3KB after Tailwind expansion).
- 효과는 크지 않지만 회귀 위험 0.

| 항목      | 평가                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------- |
| 가능성    | 높음 — 둘 다 회귀 위험 없고 작업량 작음                                                            |
| ROI       | **중간** — 단독으로 render-blocking 1010ms 해소는 못함. 하지만 (d) 검증 결과 부족하면 보조 카드   |

---

## 4. 권장안 (단일 선택)

### → **(d) 동시 작업의 결과를 보고 결정**, 보조로 **(e) 대안 1 (font subset 축소)** 백그라운드 진행

**이유:**

1. **5/6 동일 패턴 재시도는 회귀 재발 가능성이 높음** — preview 측정에서 FCP +2725ms는 단순 14KB fit 실패가 아니라 패턴 자체와 환경 충돌 가능성을 시사. 회귀 원인 trace 없이 재시도하는 건 도박.
2. **현 시점 동시 작업이 HeroSpotlight + next.config + 로고**라는 건 LCP element 자체와 CSS chunk 구조에 동시 영향. 이 작업이 끝나기 전 critical CSS POC 재돌리는 건 변수가 둘이 동시에 움직여 측정 무의미.
3. **font subset 축소(e-대안 1)는 회귀 위험 0 이면서 다운로드 절감**. 동시 작업과도 독립적이라 백그라운드로 진행해도 충돌 없음.
4. **(d)가 부족하다면 그때 (a)** — chunk 통합 후 PSI 재측정에서 FCP가 여전히 1.5s+이면 그때 (a)로 진행. 단, 그땐 **preview에서 매번 측정 후 main 머지** 원칙 엄수.

---

## 5. 결정 트리 (다음 라운드)

```
동시 작업(HeroSpotlight + next.config + 로고) 머지 후 PSI 재측정
├── FCP < 1.0s & LCP < 2.5s ─────────► critical CSS 불필요. 종료.
│
├── FCP 1.0 ~ 1.5s & LCP 2.5 ~ 3.5s ─► (e-대안 1) font subset 축소만 진행. 회귀 위험 0.
│                                       그 후 재측정 → 여전히 부족하면 (a) 검토.
│
└── FCP > 1.5s 또는 LCP > 3.5s ──────► (a) POC 재실행. 단:
                                        - manual selector whitelist (above-the-fold 한정)
                                        - target ≤ 14KiB (gzip 후)
                                        - preview에서 5 ~ 10회 PSI 측정 → 회귀 0 확인 후만 main
                                        - 회귀 시 즉시 revert (5/6 패턴 학습)
```

---

## 6. 다음 라운드 측정 지표

| 지표                          | 현재 (5/11 PSI)        | 목표         | 어느 옵션에서 검증                  |
| ----------------------------- | ---------------------- | ------------ | ----------------------------------- |
| LCP (모바일)                  | 4.1 ~ 5.2s             | < 2.5s       | 동시 작업 머지 후 1차 측정          |
| FCP                           | 추정 1.5 ~ 2.0s        | < 1.0s       | 동일                                |
| Render-blocking CSS           | 1010ms (17 + 28KB gzip) | < 300ms     | (a) 또는 chunk 통합으로 해소        |
| Largest CSS chunk             | 329KB (font face 다수) | < 200KB     | (e-대안 1) font subset 축소         |
| Critical CSS inline size      | 0 (현재)               | ≤ 14KiB     | (a) 재시도 시                       |
| Preview FCP 회귀              | -                      | ≤ 0 (regression-free) | (a) 재시도 시 필수                |

---

## 7. 부록: 작업 금지 영역 (다른 에이전트 동시 작업)

이 보고서 작성 시점에 손대지 않음:

- `components/features/HeroSpotlight/*`
- `next.config.js`
- 로고 컴포넌트 (`components/common/Logo*`, `components/common/Header*`)

POC 자산은 메인 repo의 `/Users/hwang-gyeongha/saf-2026/tmp/critical-poc/` 에 그대로 유지 (worktree에는 본 보고서만 새로 작성).
