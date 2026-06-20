# Task 2 Report: 오래된 missing payment row backfill 모드 추가

## 상태

- 완료

## TDD 증거

### RED

- 명령:
  - `npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts`
- 결과 요약:
  - 실패 확인
  - 실패 지점: `scope === 'missing-payments-backfill'` 문자열이 라우트에 없어 새 backfill 모드 계약 테스트가 깨짐

### GREEN

- 명령:
  - `npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts`
- 결과 요약:
  - `Test Suites: 2 passed, 2 total`
  - `Tests: 4 passed, 4 total`

## 변경 파일

- `app/api/internal/reconcile-payments/route.ts`
- `__tests__/app/reconcile-payments-backfill-contract.test.ts`

## 구현 요약

- `scope=missing-payments-backfill` 보호 분기 추가
- `lookbackDays` 파서 추가: 기본값 `30`, 범위 `1..90`
- `limit` 파서 추가: 기본값 `100`, 범위 `1..500`
- backfill 모드에서 `paid`/`awaiting_deposit` 주문만 조회하고 `payments(id)`가 없는 주문만 대상으로 제한
- `awaiting_deposit + Toss DONE`은 기존 `reconcileMissingDoneOrder` 경로 재사용
- 일반 missing payment 복구는 기존 `ensureTossPaymentRecord`만 사용
- `scope`가 없을 때 기존 5~28분 cron 윈도우 분기는 유지

## 자가 점검

- `validateInternalCronRequest` 변경 없음
- 기존 scheduled cron의 `minAge/maxAge` 계산 및 pending/missing-payment 스캔 분기 유지
- 새 backfill 분기에서도 별도 payment insert 경로를 만들지 않고 `ensureTossPaymentRecord` 재사용
- Task 2 브리프에 명시된 파일 범위만 수정

## 우려 사항

- 배포 후 운영 실행은 브리프의 수동 `curl` 명령으로 한 번만 검증해야 함
- backfill 응답에 `errors`가 나오면 재실행 전에 해당 주문 번호별 Toss 상태와 주문 상태를 먼저 확인해야 함
