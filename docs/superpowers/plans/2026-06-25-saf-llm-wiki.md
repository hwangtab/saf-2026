# SAF LLM Wiki Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 씨앗페 캠페인 raw source를 인용 가능한 위키 페이지로 합성·유지하는 LLM Wiki 골격과 운영 스킬(ingest/query/lint)을 구축한다.

**Architecture:** saf-2026 레포 안에 3-layer(`wiki/sources` 불변 원본 → `wiki/pages` 합성 페이지 → `wiki/SCHEMA.md` 규칙)를 두고, `.claude/skills/saf-wiki/SKILL.md`가 세 연산을 SCHEMA 참조하에 수행한다. 부트스트랩 단계에선 빈 스텁만 만들고 사실을 지어내지 않는다.

**Tech Stack:** 순수 마크다운 + frontmatter. 코드 빌드 없음. 검증은 마크다운 정합성 자체 점검(lint 절차)으로 수행.

## Global Constraints

- **프레이밍 규칙 (verbatim, CLAUDE.md)**: 출품 작가 ≠ 금융 피해 당사자 — 작가는 동료 예술인을 돕는 자발적 **연대자**. 금융차별 데이터(84.9% 배제율, 48.6% 고금리 등)는 한국 예술인 전체의 **구조적 문제**이지 출품 작가 개인 상황이 아님. 올바른 프레이밍: 작품 판매 수익 → 상호부조 기금 → 금융차별 겪는 예술인 저금리 대출.
- **날조 금지**: 인터뷰·대담·좌담·가공 인물·미검증 수치는 위키 진입 금지 (memory `feedback_no_fabricated_ai_interviews`).
- **부트스트랩 단계에서 사실 창작 금지**: 초기 페이지는 frontmatter 스텁(`status: seed`)만, 본문 비움.
- **Playwright 금지** (memory `feedback_no_playwright`): 위키는 순수 마크다운이라 브라우저 검증 불필요.
- **커밋 컨벤션**: `type(scope): subject` + 본문에 `요약:` 줄 필수.
- **커밋 후 push** (memory `feedback_always_push`): 작업 완료 시 push.
- **마크다운 prettier**: 커밋 시 lint-staged가 `*.md`에 `prettier --write` 자동 적용 — 표 정렬 등이 자동 변형될 수 있음(정상).
- **artwork count**: 작가 수는 하드코딩 금지, `lib/site-stats.ts`의 `ARTIST_COUNT` 참조 (위키 본문에 숫자 직접 박지 말 것).

---

## File Structure

생성 파일:

- `wiki/SCHEMA.md` — 위키 헌법(규약·프레이밍·신뢰도·연산 규칙). 스킬이 매 연산 전 읽음.
- `wiki/index.md` — 페이지 카탈로그(주제 지향).
- `wiki/log.md` — append-only ingest 기록.
- `wiki/sources/_registry.md` — 소스 메타데이터 대장.
- `wiki/sources/.gitkeep` — 빈 디렉토리 유지.
- `wiki/pages/financial-discrimination.md` — 금융차별 통계 (seed 스텁).
- `wiki/pages/testimonies.md` — 예술인 증언 (seed 스텁).
- `wiki/pages/campaign-framing.md` — 프레이밍 모델 (seed 스텁).
- `wiki/pages/artists-and-works.md` — 출품 작가·작품 연대 맥락 (seed 스텁).
- `wiki/pages/mutual-aid-fund.md` — 상호부조 기금 구조 (seed 스텁).
- `.claude/skills/saf-wiki/SKILL.md` — 운영 스킬(ingest/query/lint 절차).

작업 순서: SCHEMA 먼저(나머지가 참조하는 규약 출처) → sources 레이어 → pages 스텁 → index/log → 스킬 → 부트스트랩 lint 자체검증.

---

### Task 1: SCHEMA.md — 위키 헌법

**Files:**

- Create: `wiki/SCHEMA.md`

**Interfaces:**

- Consumes: 없음 (최초 산출물)
- Produces: 페이지 frontmatter 규약(`title`, `status`, `last_ingested`, `sources`), 인용 각주 형식(`[^source-id]`), 소스 ID 규칙, 신뢰도 등급(1차/2차/3차), 프레이밍 가드 규칙, 세 연산 정의. 이후 모든 Task와 SKILL.md가 이 규약을 참조한다.

- [ ] **Step 1: SCHEMA.md 작성**

Create `wiki/SCHEMA.md`:

````markdown
# SAF Wiki SCHEMA — 위키 헌법

이 문서는 SAF 캠페인 LLM Wiki의 구조·규약·워크플로를 정의하는 **단일 출처**다.
`saf-wiki` 스킬은 ingest/query/lint 모든 연산 전에 이 문서를 먼저 읽는다.

## 1. 3-Layer 구조

- `wiki/sources/` — raw sources. **불변·읽기 전용.** 한번 들어오면 수정/삭제하지 않는다.
- `wiki/pages/` — LLM이 여러 소스를 **합성**해 유지하는 주제별 위키 페이지.
- `wiki/SCHEMA.md` — 이 문서. 규칙.
- 보조: `wiki/index.md`(카탈로그), `wiki/log.md`(시간순 기록), `wiki/sources/_registry.md`(소스 대장).

## 2. 소스 ID 규칙

- 소문자 kebab-case, 발행처·주제·연도 조합. 예: `psk-finance-survey-2024`, `artist-testimony-kim-2025`.
- 원본 파일은 `wiki/sources/<id>.<ext>` 로 저장(불변). 대용량(영상·초대형 PDF)은 파일 생략하고 `_registry.md`에 외부 링크만.

## 3. 페이지 규약

각 페이지는 frontmatter + 본문으로 구성한다.

## ​```yaml

title: 금융 차별 통계
status: seed | active | stale
last_ingested: YYYY-MM-DD | null
sources: [psk-finance-survey-2024, ...]

---

​```

- `status: seed` — 골격만 있고 내용 없음(부트스트랩 직후).
- `status: active` — 최소 1개 소스가 합성됨.
- `status: stale` — 더 최신 소스 존재 추정, 재검토 필요(lint가 표시).
- 본문의 **모든 사실 주장**은 인용 각주를 단다: `... 배제율 84.9%[^psk-finance-survey-2024].`
- 페이지 하단에 각주 정의: `[^psk-finance-survey-2024]: 한국예술인 금융실태조사, 발행처, 2024 (sources/psk-finance-survey-2024.pdf)`
- 관련 페이지는 `[[campaign-framing]]` 형식으로 cross-reference.

## 4. 신뢰도 등급

- **1차**: 공식 통계·직접 증언·원자료. 인용 시 등급 명시 불필요(기본).
- **2차**: 언론 인용·재인용. 각주에 `(2차)` 표기.
- **3차**: 추정·해석. 본문에 "추정" 명시 + 각주 `(3차)`.
- 등급이 낮을수록 보수적으로 서술하고, 1차 소스로 대체 가능하면 우선.

## 5. 프레이밍 가드 (절대 규칙)

- 출품 작가 ≠ 금융 피해 당사자. 작가는 동료 예술인을 돕는 자발적 **연대자**.
- 금융차별 데이터(84.9% 배제율, 48.6% 고금리 등)는 한국 예술인 전체의 **구조적 문제**이지
  출품 작가 개인의 상황이 아니다.
- 올바른 프레이밍: 작품 판매 수익 → 상호부조 기금 → 금융차별 겪는 예술인 저금리 대출.
- ingest 시 "작가=불우한 피해자" 프레임이 감지되면 교정 후 통합한다.
- 작가 수는 본문에 숫자로 박지 않는다(`lib/site-stats.ts`의 `ARTIST_COUNT`가 출처).

## 6. 날조 금지

- 인터뷰·대담·좌담·가공 인물·미검증 수치는 위키에 들이지 않는다.
- 출처 없이 "들었다/추정된다" 수준이면 ingest를 보류하고 플래그한다.

## 7. 세 연산

- **ingest**: 새 소스를 `sources/`에 보관·등록하고, 사실을 추출해 관련 페이지에 합성한다.
- **query**: 페이지를 읽어 인용과 함께 답한다. 근거 없으면 "위키에 없음"이라 답한다(추측 금지).
- **lint**: 모순·stale·고아·무출처·프레이밍 위반을 **진단만** 한다(자동 수정 안 함).

절차의 상세는 `.claude/skills/saf-wiki/SKILL.md` 참조.
````

> 주의: 위 frontmatter 예시 블록의 백틱 펜스는 실제 파일에서 일반 ` 펜스로 작성한다(여기 ​` 는 표시용 이스케이프).

- [ ] **Step 2: 자체 검증 — 규약 완전성 확인**

확인 항목(읽고 눈으로 점검):

- frontmatter 4개 필드(`title`, `status`, `last_ingested`, `sources`)가 모두 정의됐는가
- 인용 각주 형식 예시가 있는가
- 프레이밍 가드에 CLAUDE.md verbatim 3원칙이 다 있는가
- 세 연산이 한 줄씩 정의됐는가

Expected: 4개 항목 모두 충족.

- [ ] **Step 3: 커밋**

```bash
git add wiki/SCHEMA.md
git commit -m "feat(wiki): SAF LLM Wiki SCHEMA 헌법 추가

요약: 위키 규약·프레이밍 가드·신뢰도 등급·세 연산 정의

- 페이지 frontmatter 규약, 인용 각주 형식, 소스 ID 규칙
- 프레이밍 가드(작가≠피해자)·날조 금지 절대 규칙"
```

---

### Task 2: sources 레이어 — \_registry.md + 디렉토리

**Files:**

- Create: `wiki/sources/_registry.md`
- Create: `wiki/sources/.gitkeep`

**Interfaces:**

- Consumes: Task 1의 소스 ID 규칙·신뢰도 등급
- Produces: `_registry.md`의 소스 행 형식(테이블 컬럼: ID · 제목 · 출처 · 날짜 · 신뢰도 · 파일). ingest 연산이 새 소스마다 이 테이블에 행을 추가한다.

- [ ] **Step 1: \_registry.md 작성**

Create `wiki/sources/_registry.md`:

```markdown
# Source Registry

`wiki/sources/`에 보관된 모든 raw source의 대장. ingest 시 한 행씩 추가한다.
원본 파일은 불변(읽기 전용) — 수정·삭제하지 않는다.

| ID  | 제목 | 출처/발행처 | 날짜 | 신뢰도 | 파일 |
| --- | ---- | ----------- | ---- | ------ | ---- |

<!-- 예시 (실제 ingest 전까지 비어 있음):
| psk-finance-survey-2024 | 예술인 금융실태조사 | OOO | 2024-MM-DD | 1차 | sources/psk-finance-survey-2024.pdf |
-->
```

- [ ] **Step 2: .gitkeep 생성**

Create `wiki/sources/.gitkeep` (빈 파일):

```

```

- [ ] **Step 3: 자체 검증**

확인: `_registry.md` 테이블 헤더가 6개 컬럼(ID·제목·출처·날짜·신뢰도·파일)이고, 행은 비어 있으며 예시는 주석 처리됨.

Expected: 충족.

- [ ] **Step 4: 커밋**

```bash
git add wiki/sources/_registry.md wiki/sources/.gitkeep
git commit -m "feat(wiki): sources 레이어 — 소스 대장 추가

요약: raw source 메타데이터 registry + 빈 sources 디렉토리

- 6컬럼 테이블(ID·제목·출처·날짜·신뢰도·파일), ingest가 행 추가"
```

---

### Task 3: pages 레이어 — 5개 seed 스텁

**Files:**

- Create: `wiki/pages/financial-discrimination.md`
- Create: `wiki/pages/testimonies.md`
- Create: `wiki/pages/campaign-framing.md`
- Create: `wiki/pages/artists-and-works.md`
- Create: `wiki/pages/mutual-aid-fund.md`

**Interfaces:**

- Consumes: Task 1의 페이지 frontmatter 규약(`title`/`status`/`last_ingested`/`sources`)
- Produces: 5개 페이지의 파일명·title — index.md(Task 4)가 이들을 카탈로그에 등록하고, ingest가 사실을 합성해 넣을 대상.

- [ ] **Step 1: financial-discrimination.md (seed 스텁) 작성**

Create `wiki/pages/financial-discrimination.md`:

```markdown
---
title: 금융 차별 통계
status: seed
last_ingested: null
sources: []
---

# 금융 차별 통계

> **seed** — 아직 소스가 합성되지 않았습니다. 첫 ingest 시 한국 예술인의 금융 배제율·고금리·
> 구조적 차별 통계를 출처별 인용과 함께 채웁니다. 이 데이터는 한국 예술인 전체의 구조적
> 문제이지 출품 작가 개인의 상황이 아닙니다. ([[campaign-framing]] 참조)

## 다룰 주제 (placeholder)

- 금융 서비스 배제율
- 고금리 대출 실태
- 구조적 차별 메커니즘
```

- [ ] **Step 2: testimonies.md (seed 스텁) 작성**

Create `wiki/pages/testimonies.md`:

```markdown
---
title: 예술인 증언
status: seed
last_ingested: null
sources: []
---

# 예술인 증언

> **seed** — 아직 소스가 합성되지 않았습니다. 첫 ingest 시 **검증된 직접 증언만** 화자·맥락·
> 검증여부와 함께 채웁니다. 인터뷰·대담·가공 인물·미검증 증언은 들이지 않습니다(SCHEMA §6).

## 다룰 주제 (placeholder)

- 금융차별 당사자 증언 (1차, 검증됨)
- 증언별 화자·맥락·출처
```

- [ ] **Step 3: campaign-framing.md (seed 스텁) 작성**

Create `wiki/pages/campaign-framing.md`:

```markdown
---
title: 캠페인 프레이밍
status: seed
last_ingested: null
sources: []
---

# 캠페인 프레이밍

> **seed** — 씨앗페 캠페인의 올바른 서사 모델. 모든 콘텐츠가 통과해야 할 렌즈입니다.

## 핵심 모델

- **출품 작가 = 연대자** (≠ 금융 피해 당사자). 동료 예술인을 돕기 위해 자발적으로 작품을 내놓음.
- **흐름**: 작품 판매 수익 → 상호부조 기금([[mutual-aid-fund]]) → 금융차별 겪는 예술인 저금리 대출.
- **금융차별 데이터**([[financial-discrimination]])는 한국 예술인 전체의 구조적 문제.

## 잘못된 프레이밍 (금지)

- "대출 못 받는 불우한 작가" — 출품 작가를 피해자로 묘사 ✗
- 금융차별 데이터를 출품 작가 개인 상황으로 연결 ✗
```

- [ ] **Step 4: artists-and-works.md (seed 스텁) 작성**

Create `wiki/pages/artists-and-works.md`:

```markdown
---
title: 출품 작가와 작품
status: seed
last_ingested: null
sources: []
---

# 출품 작가와 작품

> **seed** — 출품 작가·작품을 **연대의 맥락**으로 정리합니다. 작가를 피해자로 프레이밍하지
> 않습니다([[campaign-framing]]). 작가 수는 본문에 숫자로 박지 않고 `ARTIST_COUNT`를 출처로 둡니다.

## 다룰 주제 (placeholder)

- 출품 작가의 연대 동기
- 작품과 캠페인의 연결
```

- [ ] **Step 5: mutual-aid-fund.md (seed 스텁) 작성**

Create `wiki/pages/mutual-aid-fund.md`:

```markdown
---
title: 상호부조 기금
status: seed
last_ingested: null
sources: []
---

# 상호부조 기금

> **seed** — 작품 판매 수익이 상호부조 기금이 되어 금융차별 겪는 예술인에게 저금리 대출로
> 이어지는 구조를 정리합니다([[campaign-framing]]).

## 다룰 주제 (placeholder)

- 기금 조성 방식 (작품 판매 수익)
- 저금리 대출 운영 구조
```

- [ ] **Step 6: 자체 검증 — 5개 페이지 규약 준수**

확인:

- 5개 파일 모두 frontmatter 4필드(`title`/`status: seed`/`last_ingested: null`/`sources: []`) 보유
- 본문에 사실·수치가 **창작되지 않음**(placeholder·구조 설명만)
- cross-reference `[[...]]`가 실재 페이지 파일명을 가리킴

Expected: 충족. (특히 Step 6의 "사실 창작 없음"은 Global Constraints 위반 방지 게이트.)

- [ ] **Step 7: 커밋**

```bash
git add wiki/pages/
git commit -m "feat(wiki): 초기 5개 페이지 seed 스텁 추가

요약: 금융차별·증언·프레이밍·작가작품·기금 페이지 골격(내용 없음)

- frontmatter status:seed, 사실 미창작
- cross-reference 골격 연결"
```

---

### Task 4: index.md + log.md — 카탈로그·기록

**Files:**

- Create: `wiki/index.md`
- Create: `wiki/log.md`

**Interfaces:**

- Consumes: Task 3의 5개 페이지 파일명·title
- Produces: `index.md`의 페이지 행 형식(페이지 · 상태 · 요약), `log.md`의 로그 행 형식(날짜 · 연산 · 대상 · 비고). ingest가 둘 다 갱신한다.

- [ ] **Step 1: index.md 작성**

Create `wiki/index.md`:

```markdown
# SAF Wiki Index

캠페인 지식 위키의 페이지 카탈로그. query 시 후보 선정에 쓰인다.
규약은 [SCHEMA.md](SCHEMA.md), 소스 대장은 [sources/\_registry.md](sources/_registry.md).

| 페이지                                                        | 상태 | 요약                                            |
| ------------------------------------------------------------- | ---- | ----------------------------------------------- |
| [financial-discrimination](pages/financial-discrimination.md) | seed | 한국 예술인 금융 배제율·고금리·구조적 차별 통계 |
| [testimonies](pages/testimonies.md)                           | seed | 검증된 예술인 직접 증언                         |
| [campaign-framing](pages/campaign-framing.md)                 | seed | 상호부조 기금 모델·올바른/잘못된 프레이밍       |
| [artists-and-works](pages/artists-and-works.md)               | seed | 출품 작가·작품의 연대 맥락                      |
| [mutual-aid-fund](pages/mutual-aid-fund.md)                   | seed | 작품 수익→기금→저금리 대출 구조                 |
```

- [ ] **Step 2: log.md 작성**

Create `wiki/log.md`:

```markdown
# SAF Wiki Log

append-only. 각 ingest/lint 활동을 시간순 한 줄로 기록한다(최신이 아래).

| 날짜       | 연산      | 대상       | 비고                                     |
| ---------- | --------- | ---------- | ---------------------------------------- |
| 2026-06-25 | bootstrap | wiki/ 골격 | SCHEMA·5 seed 페이지·registry·index 생성 |
```

- [ ] **Step 3: 자체 검증**

확인: index의 5개 행이 Task 3 파일명과 일치, 모두 `seed` 상태. log에 bootstrap 행 1개.

Expected: 충족.

- [ ] **Step 4: 커밋**

```bash
git add wiki/index.md wiki/log.md
git commit -m "feat(wiki): index 카탈로그 + log 기록 추가

요약: 5개 seed 페이지 카탈로그 + bootstrap 로그 1행

- query 후보 선정용 index, append-only log"
```

---

### Task 5: saf-wiki 스킬 — 운영 절차

**Files:**

- Create: `.claude/skills/saf-wiki/SKILL.md`

**Interfaces:**

- Consumes: Task 1~4의 모든 규약·파일 경로(`wiki/SCHEMA.md`, `wiki/index.md`, `wiki/log.md`, `wiki/sources/_registry.md`, `wiki/pages/*`)
- Produces: `/saf-wiki ingest|query|lint` 트리거와 절차. 최종 사용자 진입점.

- [ ] **Step 1: SKILL.md 작성**

Create `.claude/skills/saf-wiki/SKILL.md`:

```markdown
---
name: saf-wiki
description: 씨앗페(SAF) 캠페인 지식 위키를 운영한다. 캠페인 raw source(금융차별 통계·증언·보고서·기획안)를 인용 가능한 위키 페이지로 합성·유지하고, 인용과 함께 캠페인 사실을 답한다. 트리거 — "씨앗페 위키", "캠페인 자료 ingest", "위키에 추가/흡수", "캠페인 사실 확인", "위키 lint/점검", "위키에서 찾아줘", "/saf-wiki".
---

# SAF Wiki 운영 스킬

`wiki/` 디렉토리의 캠페인 지식 위키를 ingest/query/lint 세 연산으로 운영한다.

## 절대 선행 규칙

**모든 연산 전에 `wiki/SCHEMA.md`를 먼저 읽는다.** SCHEMA가 프레이밍 가드·인용 규약·
신뢰도 등급·소스 ID 규칙의 단일 출처다. SCHEMA와 충돌하는 행동은 하지 않는다.

## 연산 1: ingest `<문서 경로 또는 내용>`

1. `wiki/SCHEMA.md`를 읽는다.
2. 소스 ID를 SCHEMA §2 규칙으로 정한다(kebab-case, 발행처·주제·연도).
3. 원본을 `wiki/sources/<id>.<ext>`에 복사한다(**불변** — 이후 수정·삭제 금지).
   대용량(영상·초대형 PDF)이면 파일 생략하고 외부 링크만 등록한다.
4. `wiki/sources/_registry.md` 테이블에 행을 추가한다(ID·제목·출처·날짜·신뢰도·파일).
5. 문서에서 핵심 사실을 추출한다. **프레이밍 가드(SCHEMA §5) 적용**: "작가=피해자"
   프레임이면 교정한다. **날조 금지(SCHEMA §6)**: 인터뷰/가공/미검증이면 보류하고 사용자에게 알린다.
6. 어느 기존 페이지(`wiki/pages/*`)에 통합할지 판단한다. 없으면 새 페이지를 SCHEMA §3
   규약으로 제안한다.
7. 대상 페이지를 갱신한다: 사실 추가 + 각주 인용(`[^id]`) + 필요 시 `[[cross-ref]]`.
   frontmatter의 `sources`에 ID 추가, `last_ingested` 갱신, `status`를 `active`로.
8. `wiki/index.md`의 해당 행 상태·요약을 갱신한다.
9. `wiki/log.md`에 한 줄 추가한다(날짜·`ingest`·대상 페이지·비고).

## 연산 2: query `<질문>`

1. `wiki/SCHEMA.md`와 `wiki/index.md`를 읽는다.
2. index로 관련 페이지 후보를 고르고 해당 `wiki/pages/*`를 읽는다.
3. 답을 합성하되 **모든 사실 주장에 각주 인용**(`[^id]`)을 붙인다. 신뢰도 2·3차는 등급을 밝힌다.
4. 위키에 근거가 없으면 **추측하지 말고** "위키에 없음 — 해당 소스 ingest 필요"라고 답한다.

## 연산 3: lint (진단만, 자동 수정 안 함)

1. `wiki/SCHEMA.md`·`index.md`·`pages/*`·`sources/_registry.md`를 읽는다.
2. 다음을 점검해 **우선순위 리포트**만 낸다(파일 변경 없음):
   - **모순**: 같은 수치를 다르게 말하는 페이지 쌍.
   - **stale**: `last_ingested`가 오래됐거나 더 최신 소스가 있는 페이지.
   - **고아**: 어디서도 `[[링크]]`되지 않은 페이지 / 끊긴 링크(없는 페이지 가리킴).
   - **무출처 주장**: 각주 인용 없는 사실 문장(seed 스텁의 placeholder는 제외).
   - **프레이밍 위반**: "작가=피해자" 프레임·미검증 수치·본문 작가 수 하드코딩.
3. 사용자가 무엇을 고칠지 결정한다. 자동 수정하지 않는다.

## 트리거 매핑

- "…를 위키에 넣어줘 / ingest / 흡수" → ingest
- "위키에서 …을 찾아줘 / 캠페인 사실 / 인용 달아줘" → query
- "위키 점검 / lint / 모순 확인 / 건강검진" → lint
```

> 주의: 위 본문의 frontmatter 각주 예시 `[^id]`는 그대로 작성한다.

- [ ] **Step 2: 자체 검증 — 스킬 무결성**

확인:

- frontmatter `name: saf-wiki`, `description`에 트리거 키워드 포함
- 세 연산 절차가 모두 "SCHEMA 먼저 읽기"로 시작
- ingest 절차에 프레이밍 가드·날조 금지 단계 포함
- query에 "위키에 없으면 추측 금지" 포함
- lint가 "자동 수정 안 함" 명시

Expected: 충족.

- [ ] **Step 3: 커밋**

```bash
git add .claude/skills/saf-wiki/SKILL.md
git commit -m "feat(wiki): saf-wiki 운영 스킬 추가

요약: ingest/query/lint 세 연산 절차, SCHEMA 선행 참조

- 프레이밍 가드·날조 금지·인용 추적 내장
- query 추측 금지, lint 진단 전용"
```

---

### Task 6: 부트스트랩 lint 자체검증 + push

**Files:**

- Modify: `wiki/log.md` (lint 결과 로그 1행 추가)

**Interfaces:**

- Consumes: Task 1~5 전체 산출물
- Produces: 없음 (검증·마무리 단계)

- [ ] **Step 1: lint 절차 수동 실행 (자체검증)**

SKILL.md의 lint 절차를 그대로 따라 골격을 점검한다(파일 변경 없이 리포트만 머릿속/응답에):

- **모순**: 페이지에 사실이 없으니 모순 0건이어야 함.
- **stale**: 모두 `last_ingested: null`(seed) — 정상.
- **고아**: index가 5개 페이지를 모두 링크하는가? 각 페이지의 `[[...]]`가 실재 파일을 가리키는가?
  (`financial-discrimination`, `testimonies`, `campaign-framing`, `artists-and-works`, `mutual-aid-fund` 5개 외 링크 없어야 함)
- **무출처 주장**: seed placeholder만 있으니 0건이어야 함.
- **프레이밍 위반**: 본문에 작가 수 숫자·피해자 프레임 0건이어야 함.

Expected: 모든 항목 위반 0건(stale은 seed라 정상). 위반 발견 시 해당 Task로 돌아가 수정.

- [ ] **Step 2: log.md에 lint 결과 기록**

`wiki/log.md` 테이블에 행 추가:

```markdown
| 2026-06-25 | lint | wiki/ 골격 | 부트스트랩 자체검증 — 위반 0건(모순·고아·무출처·프레이밍), 5 페이지 seed |
```

- [ ] **Step 3: 커밋 + push**

```bash
git add wiki/log.md
git commit -m "chore(wiki): 부트스트랩 lint 자체검증 통과 기록

요약: 위키 골격 lint 검증 — 위반 0건, ingest 준비 완료

- 모순·고아·무출처·프레이밍 위반 0건 확인"
git push
```

- [ ] **Step 4: 최종 확인**

```bash
git status
ls -R wiki/ .claude/skills/saf-wiki/
```

Expected: working tree clean(기존 미커밋 `content/changelog.json`·`lib/site-stats.ts`는 건드리지 않고 그대로), `wiki/` 11개 파일 + 스킬 1개 존재.

---

## Self-Review

**1. Spec coverage:**

- 아키텍처 3-layer → Task 1·2·3 (SCHEMA·sources·pages) ✓
- raw source 안 A(레포 커밋) → Task 2 + SKILL ingest step 3 ✓
- SCHEMA 내용(프레이밍·신뢰도·금지) → Task 1 ✓
- 초기 5개 페이지 → Task 3 ✓
- index/log → Task 4 ✓
- 세 연산 워크플로 → Task 5 SKILL.md ✓
- 스킬 배치·트리거 → Task 5 ✓
- 부트스트랩 스텁만(사실 미창작) → Task 3 Step 6 게이트 ✓
- lint 자체검증 → Task 6 ✓
- 인용 형식 → Task 1 §3 + SKILL query ✓

갭 없음.

**2. Placeholder scan:** 각 Task에 실제 파일 내용 전문 포함. "TBD/TODO/적절히" 없음. seed 페이지의 "placeholder"는 의도된 산출물(스텁)이지 계획 공백이 아님.

**3. Type consistency:** frontmatter 4필드(`title`/`status`/`last_ingested`/`sources`)가 Task 1 정의 → Task 3 사용 일치. 소스 ID 형식(kebab-case) Task 1·2·5 일치. registry 6컬럼 Task 2 정의 → SKILL ingest 일치. 페이지 파일명 5개 Task 3·4·6 일치.
