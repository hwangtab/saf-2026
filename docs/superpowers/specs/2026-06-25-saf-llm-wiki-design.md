# SAF LLM Wiki — 설계 문서

**날짜**: 2026-06-25
**상태**: 승인됨 (구현 대기)
**참고**: [Karpathy LLM Wiki gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)

## 1. 목적

씨앗페(SAF) 캠페인의 **진실 원천(source of truth) 지식베이스**를 구축한다. 금융차별
통계·증언·보고서·기획안 같은 캠페인 raw source를 LLM이 읽어 핵심을 추출하고, 주제별
위키 페이지로 **합성·유지**한다. 목표는 기사·카피·영상 스크립트를 만들 때 위키의
**검증되고 인용 가능한 사실**에서 끌어오게 하여, 날조·미검증 수치·잘못된 프레이밍을
구조적으로 차단하는 것이다.

기존 `.claude/projects/.../memory/` 시스템(개발·운영 교훈의 fact 적층)과는 **별개**다.
memory는 Claude의 작업 메모리, 이 위키는 캠페인 **콘텐츠 지식**이다.

### 기존 memory 시스템과의 차이

|              | memory/                    | LLM Wiki                          |
| ------------ | -------------------------- | --------------------------------- |
| 기본 단위    | 교훈 1개 = 파일 1개 (적층) | 주제 1개 = 페이지 1개 (합성)      |
| 원본(source) | 개념 없음                  | raw sources가 1급 시민, 인용 추적 |
| 갱신         | 즉흥 저장                  | ingest 파이프라인                 |
| 품질관리     | 수동                       | lint 연산 (모순·stale·고아 점검)  |
| 이력         | git                        | log.md + git                      |

## 2. 아키텍처 (3-layer)

raw sources(불변) → wiki pages(합성) → schema(규칙). saf-2026 레포 안에 두고,
운영은 `.claude/skills/`의 스킬이 담당한다.

```
saf-2026/
├── wiki/
│   ├── SCHEMA.md          # 위키 구조·워크플로·프레이밍 규칙 (단일 출처)
│   ├── index.md           # 모든 페이지 카탈로그 (주제 지향)
│   ├── log.md             # append-only 시간순 ingest 기록
│   ├── sources/           # raw sources (불변, 읽기 전용)
│   │   ├── _registry.md   # 소스 목록: ID·제목·출처·날짜·신뢰도
│   │   └── <source-id>.*  # 원본 문서 (보고서·CSV·증언 등)
│   └── pages/             # LLM이 합성·유지하는 위키 페이지
│       ├── financial-discrimination.md
│       ├── testimonies.md
│       ├── campaign-framing.md
│       ├── artists-and-works.md
│       └── mutual-aid-fund.md
└── .claude/skills/saf-wiki/
    └── SKILL.md           # ingest/query/lint 워크플로, SCHEMA.md 참조
```

**raw source 보관 방침 (안 A 확정)**: 원본 문서를 `wiki/sources/`에 그대로 커밋한다.
완전한 재현성과 인용 역추적을 보장. 대용량 1차 자료(영상·초대형 PDF)만 예외적으로
`_registry.md`에 메타데이터+링크만 두는 하이브리드 허용.

## 3. SCHEMA.md (위키의 헌법)

스킬이 매 연산마다 먼저 읽는다.

- **프레이밍 규칙** (CLAUDE.md 캠페인 구조를 위키 차원으로 못박음):
  - 출품 작가 ≠ 금융 피해 당사자. 작가는 동료 예술인을 돕는 **연대자**.
  - 금융차별 데이터(84.9% 배제율 등)는 한국 예술인 전체의 **구조적 문제**이지 출품
    작가 개인의 상황이 아님.
  - 올바른 프레이밍: 작품 판매 수익 → 상호부조 기금 → 금융차별 겪는 예술인에게 저금리 대출.
- **페이지 규약**: frontmatter(`title`, `status`, `last_ingested`, `sources: [id...]`) +
  본문. 모든 주장 뒤에 `[^source-id]` 인용 각주.
- **신뢰도 등급**: 1차(공식 통계·직접 증언) > 2차(언론 인용) > 3차(추정). 페이지에 표기.
- **금지 규칙**: 날조 인터뷰·가공 인물·미검증 수치 위키 진입 금지
  (memory `feedback_no_fabricated_ai_interviews` 반영).

### 초기 페이지 세트

| 페이지                        | 내용                                              |
| ----------------------------- | ------------------------------------------------- |
| `financial-discrimination.md` | 배제율·고금리·구조적 차별 통계, 출처별 인용       |
| `testimonies.md`              | 예술인 증언 — 화자·맥락·검증여부                  |
| `campaign-framing.md`         | 상호부조 기금 모델, 올바른/잘못된 프레이밍 대조   |
| `artists-and-works.md`        | 출품 작가·작품의 연대 맥락 (피해자 프레이밍 금지) |
| `mutual-aid-fund.md`          | 저금리 대출·기금 운영 구조                        |

페이지는 합성물이다 — 여러 소스의 정보가 한 페이지로 통합되고, 각 사실은 source로 역추적된다.

**인용 형식**: 페이지 하단 각주 — `[^psk-2024-report]: 출처 제목, 발행처, 날짜 (sources/psk-2024-report.pdf)`.
query 답변 시 이 각주가 그대로 인용으로 따라간다.

## 4. 세 연산 워크플로

### `/saf-wiki ingest <문서경로 또는 내용>`

1. SCHEMA.md 로드 (프레이밍·규약·신뢰도 규칙).
2. 원본을 `wiki/sources/<id>.*`에 복사(불변), `_registry.md`에 메타데이터 등록.
3. 문서를 읽고 핵심 사실 추출 → 통합될 기존 페이지 판단, 없으면 새 페이지 제안.
4. 관련 페이지 갱신: 사실 추가, 인용 각주 연결, cross-reference(`[[다른-페이지]]`).
5. **프레이밍 가드**: "작가=피해자" 프레임이면 교정 후 통합, 날조 의심이면 보류 플래그.
6. `index.md` 갱신, `log.md`에 한 줄 기록(언제·무엇을·어느 페이지에).

### `/saf-wiki query <질문>`

1. `index.md`로 관련 페이지 후보 선정 → 해당 페이지 읽기.
2. 답변 합성하되 **모든 주장에 인용**(`[^source-id]`) 부착.
3. 위키에 근거 없으면 "위키에 없음 — ingest 필요"라고 정직하게 답(추측 금지).

### `/saf-wiki lint` (진단만, 자동수정 안 함)

- **모순**: 같은 수치를 다르게 말하는 페이지 쌍.
- **stale**: `last_ingested` 오래됨 / 더 최신 소스 존재.
- **고아**: 어디서도 링크 안 된 페이지 / 끊긴 `[[링크]]`.
- **무출처 주장**: 인용 각주 없는 사실 문장.
- **프레이밍 위반**: 피해자 프레임·미검증 수치 잔존.
- 우선순위 리포트 → 사용자가 고칠지 결정 (자동 수정은 안전상 안 함).

세 연산 모두 SCHEMA.md를 매번 참조해 규칙 일관성을 보장. ingest는 쓰기, query는 읽기,
lint는 읽고 진단만.

## 5. 스킬 구조 & 부트스트랩

- **배치**: `.claude/skills/saf-wiki/SKILL.md`. description에 트리거("씨앗페 위키",
  "캠페인 자료 ingest", "위키에 추가", "캠페인 사실 확인" 등). 본문은 세 연산 절차 +
  "항상 `wiki/SCHEMA.md`를 먼저 읽어라" 지시.
- **부트스트랩 (최초 1회)**: 빈 골격 생성 — `SCHEMA.md`, 빈 `index.md`·`log.md`,
  `sources/_registry.md`, 5개 초기 페이지의 frontmatter 스텁(status: `seed`, 내용 비움).
  **이 단계에선 사실을 지어내지 않는다** — 스텁만. 실제 내용은 첫 ingest부터.

## 6. 검증

- Playwright 등 브라우저 자동화 금지(memory `feedback_no_playwright`). 위키는 순수
  마크다운이라 불필요.
- 부트스트랩 후 `/saf-wiki lint` 1회 실행 → 골격이 규약에 맞는지 자체 점검.
- 실제 ingest 검증은 사용자가 첫 캠페인 문서를 제공할 때.

## 7. 범위 밖 (YAGNI)

- 기존 memory 시스템 마이그레이션 — 별개 유지.
- 웹 UI·검색 인덱스·임베딩 — 마크다운 + index.md로 충분.
- 자동 lint 수정 — 진단만.
- 큰 바이너리 LFS 파이프라인 — 하이브리드 메타데이터로 회피.
