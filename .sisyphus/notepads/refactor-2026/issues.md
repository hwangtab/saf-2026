# SAF 2026 리팩토링 - 이슈 및 주의사항

## 알려진 위험 요소

### resolveLocale vs getServerLocale 혼동 위험

- `getServerLocale()`: async, cookies() 기반, 서버 컴포넌트에서 직접 locale 읽기
- `resolveLocale(locale: string)`: sync, string → 'ko'|'en' 변환 유틸
- news/page.tsx는 `LocaleCode` 타입 사용 (다른 파일과 다름) — 주의

### lib/seo.ts createPageMetadata 한계

- `locale` 파라미터가 있지만 현재 대부분 페이지는 locale을 동적으로 결정
- `getLocale()` + `resolveLocale()` 조합으로 locale 결정 후 함수에 전달 필요

## 진행 상황

- [ ] Phase 1: resolveLocale 중복 제거
- [ ] Phase 2: createPageMetadata 활용 통일
- [ ] Phase 3: 대형 파일 분리

## [Phase 1 완료] resolveLocale 중복 제거

- 수정된 파일: lib/server-locale.ts + 13개 페이지
- type-check: 통과
- lint: 통과

## [Phase 2 완료] createStandardPageMetadata 통일

- 수정된 파일: lib/seo.ts + 10개 페이지
- type-check: 통과
- lint: 통과

## [Phase 3-A 완료] admin-artwork-list.tsx 헬퍼 분리

- 생성: app/(portal)/admin/artworks/\_utils.ts
- 수정: admin-artwork-list.tsx
- type-check: 통과
- lint: 통과

## [Phase 3-B 완료] logs-list.tsx 헬퍼 분리

- 생성: app/(portal)/admin/logs/\_utils.ts
- 수정: logs-list.tsx
- type-check: 통과
- lint: 통과

## [Button type 정리 완료] type 없는 `<button>`에 `type="button"` 추가

- 대상 목록 44개 파일 점검, 실제 수정 24개 파일 / 총 35개 버튼
- 예외 준수: 기존 `type="submit"`, `type="reset"`, 기존 `type` 선언(멀티라인 포함) 미변경
- 검증: `npm run type-check` 통과, `npm run lint` 통과

## [빈 catch 블록 로깅 추가 완료] catch {} -> catch (error) + console.error

- 변경 범위: `catch\s*\{` 패턴 56개를 모두 `catch (error) { console.error(..., error); }`로 교체
- 컨텍스트 메시지: 파일/함수 맥락 기반으로 실패 원인 로그 문구 추가 (기능 로직 변경 없음)
- 검증: `npm run type-check` 통과, `npm run lint` 통과
- LSP 진단: 변경 파일 대상 `lsp_diagnostics` error 레벨 모두 이상 없음
