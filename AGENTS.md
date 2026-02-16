# AGENTS.md

이 파일은 SAF 2026 프로젝트에서 작업하는 모든 AI 에이전트(Antigravity, Claude, Gemini 등)를 위한 핵심 지침서입니다. 에이전트는 이 규칙을 반드시 준수해야 합니다.

## 🚨 핵심 운영 규칙 (Critical Rules)

에이전트는 다음 규칙을 예외 없이 따라야 합니다:

> [!CAUTION]
> **보고 작업 시 엄격한 읽기 전용 모드 (Strict Read-Only Mode)**
> 사용자가 "보고(report)", "확인(check)", "검증(verify)" 등을 요청할 경우, **명시적인 지심 없이 코드를 수정하지 마십시오.**
>
> - 읽기 작업(grep, view_file 등)만 수행합니다.
> - 발견 사항은 `notify_user` 또는 아티팩트를 통해 보고만 수행합니다.
> - 임의로 이슈를 자동 수정하지 마십시오.
> - 수정을 진행하기 전 반드시 `implementation_plan`을 작성하고 승인을 받으십시오.

> [!IMPORTANT]
> **기본 언어 및 소통 (Language Preference)**
>
> - 모든 `implementation_plan` 아티팩트는 **한국어**로 작성해야 합니다.
> - 사용자와 소통하거나 질문할 때는 항상 **한국어**를 사용합니다.

## 프로젝트 개요 (Project Overview)

**SAF (Seed Art Festival) 2026**은 한국 예술인들이 겪는 금융 차별 문제를 해결하기 위한 사회적 캠페인 웹 플랫폼입니다.

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database/Auth**: Supabase
- **Hosting**: Vercel (Public pages: SSG / Portals: SSR)

## 포털 구조 (Multi-Portal Structure)

| Portal           | Path           | Role        | Purpose                                      |
| ---------------- | -------------- | ----------- | -------------------------------------------- |
| Admin            | `/admin/*`     | `admin`     | 사용자, 작품, 콘텐츠 관리, 로그, 휴지통 관리 |
| Artist Dashboard | `/dashboard/*` | `artist`    | 본인의 작품 및 프로필 관리                   |
| Exhibitor        | `/exhibitor/*` | `exhibitor` | 전시 작가 및 작품 관리                       |

## 데이터 관리 지침 (Data Guidelines)

### 작품 데이터 (`content/saf2026-artworks.ts`)

작품 데이터를 추가/수정할 때 다음 규칙을 준수하십시오:

- **검증**: 데이터 수정 후 반드시 `npm run validate-artworks`를 실행하여 무결성을 확인하십시오.
- **포맷팅**: `npm run format-artworks`를 사용하여 텍스트 가독성을 정리하십시오.
- **CSV 처리**: `profile`, `description`, `history` 등 원본 내용을 절대 요약하거나 단축하지 말고 전체 텍스트를 유지하십시오.
- **필드 규칙**: `id`는 고유 숫자 문자열, `size`는 `숫자x숫자cm` (x 사용), 가격은 `₩X,XXX,XXX` 형식을 지키십시오. 정보가 없으면 `"확인 중"`을 입력하십시오.

## 아티팩트 및 커뮤니케이션 (Artifacts & Communication)

- **작업 관리**: 복잡한 작업 시 `task.md`를 생성하여 체크리스트를 관리하십시오.
- **계획 수립**: 실행(EXECUTION) 모드로 들어가기 전 항상 `implementation_plan.md`를 작성하고 사용자 승인을 받으십시오.
- **결과 보고**: 작업 완료 후 `walkthrough.md`를 통해 변경 사항과 테스트 결과를 요약 전달하십시오.
- **변경 알림**: UI 변경 시에는 스크린샷이나 레코딩을 포함하여 설명하십시오.

## 개발 가이드라인 요약

- **Lint/Type**: `npm run lint`, `npm run type-check` 통과 필수.
- **Import Order**: 1. React/Next, 2. External Packages, 3. Internal (`@/`), 4. Types 순서 준수.
- **Styling**: `lib/colors.ts`의 `BRAND_COLORS` 사용. Tailwind utility 클래스 우선 지향.
- **Client/Server**: 인터랙션이 필요한 경우에만 `'use client'` 사용.

---

_이 가이드는 `GEMINI.md`와 `CLAUDE.md`의 핵심 내용을 통합하고 에이전트 전용 규칙을 강화한 것입니다._
