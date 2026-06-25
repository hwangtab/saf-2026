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

```yaml
title: 금융 차별 통계
status: seed | active | stale
last_ingested: YYYY-MM-DD | null
sources: [psk-finance-survey-2024, ...]
```

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
