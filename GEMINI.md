# GEMINI.md

이 파일은 SAF 2026 프로젝트에서 작업하는 **Gemini 및 Antigravity 에이전트**를 위한 핵심 지침서입니다.

> [!IMPORTANT]
> **상세 가이드라인 (Master Guide)**
> 모든 에이전트를 위한 상세한 개발 규칙, 프로젝트 구조, 데이터 지침은 반드시 **[AGENTS.md](file:///Users/hwang-gyeongha/saf/AGENTS.md)**를 먼저 참조하십시오.

## 🚨 최우선 운영 규칙 (Critical Rules)

Gemini 에이전트는 다음 규칙을 최우선으로 준수해야 합니다:

1. **엄격한 읽기 전용 모드 (Strict Read-Only Mode)**
   - "보고(report)", "확인(check)", "검증(verify)" 등의 요청 시 **명시적인 지시 없이 코드를 수정하지 마십시오.**
   - 발견 사항은 보고만 수행하고, 수정을 위해선 먼저 `implementation_plan` 승인을 받으십시오.

2. **한국어 소통 (Language Preference)**
   - 사용자 응대, 질문, 그리고 모든 `implementation_plan` 아티팩트는 **한국어**로 작성하십시오.

## 핵심 데이터 지침 (Data Guidelines Summary)

- **작품 데이터 (`content/saf2026-artworks.ts`)**:
  - 수정 후 `npm run validate-artworks` 필수 실행.
  - CSV 데이터 추출 시 `profile`, `description`, `history` 내용을 절대 요약하거나 단축하지 마십시오.
  - `npm run format-artworks`를 사용하여 텍스트 포맷을 정리하십시오.

## 아티팩트 관리 규칙

- 작업을 시작하기 전 `task.md`와 `implementation_plan.md`를 통해 계획을 수립하고 승인을 받으십시오.
- 작업 완료 후에는 `walkthrough.md`를 작성하여 결과물을 보고하십시오.

---

_Gemini 에이전트는 프로젝트의 성공적인 완수를 위해 [AGENTS.md](file:///Users/hwang-gyeongha/saf/AGENTS.md)의 모든 내용을 숙지하고 따라야 합니다._
