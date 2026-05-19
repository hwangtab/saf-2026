# Supabase 뭄바이 → 서울 리전 이전 계획서

> **작성일**: 2026-05-19 | **최종 업데이트**: 2026-05-19  
> **현재 리전**: `ap-south-1` (뭄바이)  
> **목표 리전**: `ap-northeast-2` (서울)  
> **전략**: Tier 1(쿼리 최적화) → Tier 2(Read Replica) → Tier 3(전체 이전) 순으로 점진 적용

---

## Tier 1 적용 현황 (2026-05-19 완료)

**배경 재평가**: 최근 두 사고(빌드 타임아웃 5/11, 청원 폴링 5/18) 모두 뭄바이 레이턴시와 무관한 애플리케이션 패턴 문제였음. 공개 페이지는 SSG라 사용자 체감 레이턴시 없음.

**실 적용 내용**:

| 파일                                      | 변경                                                                               | 절약   |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| `app/actions/admin-dashboard-overview.ts` | `fetchAnalyticsSummary` + `fetchFeedbackSummary`를 main 13-query batch와 병렬 시작 | ~130ms |
| `app/actions/admin-orders.ts`             | `getOrderDetail()` payment + sale 직렬 2개 → `Promise.all`                         | ~130ms |
| `app/actions/admin-analytics.ts`          | **이미 42개 RPC가 하나의 `Promise.all`** — 변경 불필요                             | —      |

**한계 재확인**: admin-analytics의 42개 RPC는 이미 병렬. 결국 각 요청이 뭄바이 RTT(~130ms) 1회를 냄. 코드로 줄일 수 있는 직렬 레이턴시는 소진됨. 추가 개선은 Tier 2(Read Replica) 이상이 필요.

**다음 결정 포인트**: Tier 1 적용 후 admin 체감 속도 측정 → 만족 시 STOP, 불만족 시 Tier 2(Read Replica 서울) 검토.

---

## 배경

외부 컨설팅 문서(`saf2026_supabase_migration_FINAL.md`)를 입수했으나 **전제 사실이 다수 틀려** 그대로 실행 불가. 본 문서는 saf2026 실측 인프라를 직접 검증(MCP + filesystem 조사, 2026-05-19)하여 사실을 바로잡고, 누락된 결합점·우려 사항에 대한 대책을 명시한 **실행 계획서**다.

**원칙**: 외부 문서의 방법론(리허설=본 작업, 자동 검증 4종, 5중 안전망)은 채택. 단 saf2026 실 상태에 맞춰 단계 추가/삭제.

> **Supabase 공식 자동 이전 불가** — "Restore to another project"(clone-project)는 같은 리전 내에서만 동작. 크로스 리전 불가. 수동 `pg_dump` / `pg_restore`가 유일한 정공법.

---

## 1. 실측 인프라 현황

| 항목               | 값                                                                               | 검증 방법                                                                  |
| ------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 현재 region        | `ap-south-1` (뭄바이)                                                            | MCP `get_project`                                                          |
| 목표 region        | `ap-northeast-2` (서울)                                                          | —                                                                          |
| PostgreSQL         | 17.6.1                                                                           | MCP `execute_sql`                                                          |
| Plan / PITR        | Pro + PITR 활성                                                                  | 확인됨                                                                     |
| DB 크기            | 58 MB                                                                            | `pg_database_size`                                                         |
| Storage 총량       | **866 MB** (artworks 864 MB / profiles 1.6 MB / assets 0)                        | `storage.objects`                                                          |
| Storage objects    | 2,429개 (artworks 2,423 / profiles 6)                                            | 동일                                                                       |
| 버킷 (모두 public) | artworks, assets, profiles                                                       | `storage.buckets`                                                          |
| 활성 extensions    | pg_stat_statements, pgcrypto, supabase_vault, uuid-ossp                          | `pg_extension`                                                             |
| Migration 파일     | 135개                                                                            | `supabase/migrations/`                                                     |
| pg_cron migration  | **2개 존재 — 활성화 여부 불명**                                                  | `20260427034200_petition_snapshot.sql`, `20260427034300_petition_cron.sql` |
| auth.users         | **51명** (Google + email OAuth만, Kakao 없음)                                    | `auth.users`                                                               |
| auth.sessions      | 102개                                                                            | 동일                                                                       |
| page_views         | 49,474행                                                                         | `pg_stat_user_tables`                                                      |
| gsc_metrics        | 1,571행                                                                          | 동일                                                                       |
| 핵심 콘텐츠        | artworks 415 / artists 128 / orders 83 / profiles 51                             | 직접 count                                                                 |
| RLS 정책           | public 25 테이블 + storage.objects 12개                                          | `pg_policies`                                                              |
| Vercel 함수 region | **이미 `icn1` (서울)** — 추가 변경 불필요                                        | `vercel.json:7`                                                            |
| Vercel Crons       | 3개 (purge-trash daily 04:00, expire-stale-orders 10분, reconcile-payments 10분) | `vercel.json:8-21`                                                         |
| 결제 시스템        | **Toss** (Stripe 아님)                                                           | `app/api/webhooks/toss/route.ts`                                           |
| Edge Functions     | **없음**                                                                         | `supabase/functions/` 미존재                                               |

### 외부 문서 사실 오류 목록

| 문서 주장               | 실제                           |
| ----------------------- | ------------------------------ |
| 두바이 `me-central-1`   | 뭄바이 `ap-south-1`            |
| Stripe                  | Toss                           |
| Vercel `iad1`           | 이미 `icn1` (서울) — 이전 완료 |
| Postgres 15.x           | 17.6.1                         |
| Edge Functions 있음     | 없음                           |
| 작품 348개 / 주문 354건 | 415개 / 83건                   |
| Kakao OAuth             | 없음 (Google + email만)        |

→ 외부 문서 "2단계 Vercel icn1 변경(D+7)" 섹션은 **이미 완료**. 실행 시 해당 단계 전부 건너뜀.

---

## 2. 우려 사항과 대책

### 2-1. 하드코딩된 project ref / Storage URL ★ 최대 우려

**우려**: project ref(`vqejnuntjnxzpgwfndtv`)가 코드와 콘텐츠 곳곳에 박혀있어 새 프로젝트로 전환 시 URL이 깨질 수 있음.

**감사 결과**:

| 위치                                                          | 내용                                     | 영향             |
| ------------------------------------------------------------- | ---------------------------------------- | ---------------- |
| `app/[locale]/layout.tsx:190,193`                             | preconnect / dns-prefetch 하드코딩       | 성능 힌트 무효화 |
| `content/magazine-drafts/*.md`                                | **30+ 개 absolute Storage URL** 박혀있음 | 이미지 404       |
| `CLAUDE.md:70`                                                | 문서용 참조                              | 코드 영향 없음   |
| `content/artworks-batches/*.ts`, `lib/utils/artwork-image.ts` | 환경변수 기반                            | **안전**         |

**대책**:

1. **D-1**: `scripts/migration/rewrite-project-ref.sh` 작성 + dry-run 확인
   - `app/[locale]/layout.tsx` preconnect/dns-prefetch → 환경변수 기반으로 수정
   - `content/magazine-drafts/**/*.md` 내 절대 URL 일괄 치환 (sed)
2. `next.config.js` remotePatterns는 `*.supabase.co` wildcard → **자동 호환, 별도 변경 불필요**
3. **외부 인덱싱된 OG 이미지 URL 대책**:
   - 구 프로젝트를 D+30까지 **읽기 전용 유지** (Pause 아님)
   - GSC `Crawl errors` 페이지에서 404 증가 추적 (D+1 ~ D+30)

---

### 2-2. pg_cron migration 활성화 상태 불일치

**우려**: `20260427034300_petition_cron.sql` 파일 존재, 그러나 `pg_extension`에 `pg_cron` 없음.

가능한 원인:

- (a) Migration 적용됐지만 extension은 dashboard에서 별도 활성화 필요
- (b) Migration rollback됨
- (c) Migration이 처음부터 실행 안 됨

**대책**:

1. **Day 1**: 파일 내용 read + `mcp__claude_ai_Supabase__list_migrations`로 적용 이력 확인
2. **pg_cron 실제 사용 중이라면**: 신 프로젝트 생성 직후 dashboard → Extensions에서 활성화 → migration 재실행
3. **사용 안 한다면**: 별도 cleanup (본 이전과 무관)

---

### 2-3. Storage 866 MB 이전 시간

**우려**: DB 58 MB 외에 Storage 866 MB는 별도 시간 소요.

**대책 — 3단 누적 동기화**:

| 단계 | 시점          | 대상                     | 예상 시간 |
| ---- | ------------- | ------------------------ | --------- |
| 1차  | Day 3 리허설  | 전체 866 MB              | 15~20분   |
| 2차  | D-1 토요일    | delta (며칠치 신규 파일) | 5분 이내  |
| 3차  | D-day cutover | 최종 delta (지난 24시간) | 1~2분     |

- `scripts/migration/migrate-storage.js` 멱등성 + 체크포인트 파일 방식 (외부 문서 E-4 기반)
- **cutover 다운타임 예상**: storage delta 5분 + DB dump/restore 5분 + 검증 5분 + 환경변수 교체·재배포 5분 = **약 20~25분**

---

### 2-4. Toss webhook 안정성 ★ 우려 해소됨

**우려**: cutover 중 들어온 Toss webhook이 손실/중복 처리될 가능성.

**감사 결과 — 이미 견고함** (`app/api/webhooks/toss/route.ts`):

| 보호 메커니즘          | 위치                 | 내용                                              |
| ---------------------- | -------------------- | ------------------------------------------------- |
| 멱등성 가드            | `:117-119`           | `existingOrder.status === 'paid'` 시 early return |
| Toss API double-verify | `:99-107`            | webhook 수신 즉시 Toss에 재조회해 일치 확인       |
| 500 retry 유도         | `:65-67`, `:414-415` | 일시 장애 시 500 반환 → Toss 자동 재시도          |
| 중복 INSERT 방지       | `:171-176`           | artwork_sales unique 제약 + maybeSingle           |

**결론**: MAINTENANCE_MODE 동안 webhook이 들어와도 500 응답 → Toss 자동 재시도 → cutover 완료 후 정상 처리. **추가 코드 변경 불필요**.

---

### 2-5. Vercel Cron 3개 cutover 중 동작

**우려**: cutover 중 cron이 구 DB/신 DB에 잘못된 시점에 쓰기 시도.

**대책**:

1. `cutover.sh` Step 0에서 Vercel REST API로 cron 3개 모두 **disable**
2. cutover 완료 + 검증 통과 후 Step 11에서 재enable
3. **사전 준비 (D-3)**: `MAINTENANCE_MODE=true` 환경변수가 설정되면 각 cron route가 early return하도록 `app/api/internal/*/route.ts`에 가드 추가

---

### 2-6. localStorage `sb-{ref}-auth-token` 재로그인

**우려**: project ref 변경으로 모든 사용자 자동 로그아웃.

**영향 범위**: auth.users **51명**. Kakao OAuth 미사용 (Google + email만). 범위 작음.

**대책**:

1. T-3일 사전 공지: 사이트 footer 배너 + 51명 이메일 일괄 발송 ("점검 후 재로그인 필요")
2. 본 작업 후 admin 운영진(이사장님 포함)부터 우선 로그인 검증

---

### 2-7. page_views 분석 데이터 (49,474행)

**결정 (2026-05-19)**: **함께 이전** — RUM 이력 유지.

**대책**:

- `verify-counts.js` TABLES 배열에 `page_views` 명시 포함
- dump 시 `--jobs=4` parallel 사용 (대용량 테이블)
- 검증: 행 수 + 최근 24시간 sample hash로 절충 (전체 hash 비교는 비용 과다)

---

### 2-8. RLS 정책 / Storage 정책 누락

**우려**: storage.objects 12개 정책, public 25개 테이블 정책. dump/restore에서 일부 누락 가능.

**대책**:

- Day 1 인벤토리: 정책 목록 텍스트 백업 (`dumps/baseline.json`에 포함)
- 검증 단계: 두 DB의 `pg_policies` count + name 배열 비교 (자동 검증 5번째 항목)
- 외부 문서 F-3-4 Plan A(자동) → Plan B(수동) 절차 fallback 유지

---

### 2-9. SafeImage URL 변환 로직

**감사 결과** (`components/common/SafeImage.tsx:31-35`):  
render endpoint → object URL 변환은 host 무관 path-based. project ref 변경에 자연 호환. **추가 변경 불필요**.

---

## 3. 5일 실행 계획

### Day 1 (월) — 사전 인벤토리 + 코드 감사

```
[ ] 외부 문서 D-1 SQL 인벤토리 실행 → dumps/baseline.json
[ ] pg_cron migration 적용 여부 확인 (mcp list_migrations)
[ ] 하드코딩 project ref 최종 감사 → 치환 대상 파일 목록 확정
[ ] .env.migration 작성 (OLD_PROJECT / NEW_PROJECT / KEYS)
```

### Day 2 (화) — 스크립트 작성

```
[ ] scripts/migration/ 디렉토리 생성
[ ] verify-counts.js        — 25개 테이블 + auth.users 행 수 일치
[ ] verify-content-hash.js  — 핵심 테이블 SHA-256 (page_views는 sample hash)
[ ] verify-storage.js       — 2,429 objects path/size/etag 일치
[ ] verify-foreign-keys.sql — FK 무결성 0건
[ ] app/api/internal/*/route.ts 에 MAINTENANCE_MODE 가드 추가
[ ] 로컬 스모크 테스트 (같은 DB → 같은 DB 검증 통과 확인)
```

### Day 3 (수) — 서울 신규 프로젝트 생성 + 1차 리허설

```
[ ] ap-northeast-2에 신규 Supabase 프로젝트 생성 (이름: saf2026-seoul)
[ ] Auth 설정: Site URL / Redirect URLs / Google OAuth 재등록 (Kakao 없음)
[ ] Toss webhook URL: www.saf2026.com/api/webhooks/toss — Vercel route이므로 변경 없음
[ ] pg_dump (뭄바이) → pg_restore (서울) 1차 실행
[ ] Storage 1차 동기화 (~866MB, 15~20분)
[ ] 자동 검증 4+2종 실행 → 전부 통과 확인
[ ] Preview URL 발급 → 로컬에서 사이트 동작 확인
```

### Day 4 (목) — 리허설 전수 검증 + dry-run

```
[ ] 체크리스트 47개 (Stripe 항목 삭제, Toss 항목으로 수정)
[ ] cutover.sh --dry-run 검증
[ ] cutover.sh --target=preview 실제 실행 (처음~끝 작동 확인)
[ ] rewrite-project-ref.sh dry-run 확인
```

### Day 5 (일 02:00~04:00) — 본 작업

```
02:00  점검 모드 ON (MAINTENANCE_MODE=true Vercel env)
       Vercel Cron 3개 disable (Vercel REST API)
02:05  cutover.sh 실행
       - 뭄바이 DB pg_dump
       - 서울 DB pg_restore
       - Storage 최종 delta 동기화
       - 자동 검증 4+2종
02:30  검증 통과 → Vercel production 환경변수 교체
       (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY)
       → vercel deploy --prod
02:35  rewrite-project-ref.sh 실행
       (layout.tsx + content/magazine-drafts/ 치환 커밋 + 즉시 배포)
02:45  Vercel Cron 3개 재enable
       MAINTENANCE_MODE 환경변수 삭제
02:50  사이트 응답 자동 확인 (curl)
03:00  ✅ COMPLETE 알림
03:15  이사장님 직접 점검 (7개 항목)
03:30  결단: 성공 또는 rollback.sh
```

### D+1 ~ D+30 — 사후 안정화

```
D+1   RUM 모니터링 (admin/analytics WebVitalsPanel + nav alert dot)
D+7   GSC Crawl errors 점검 (구 Storage URL 404 추세)
D+14  구 프로젝트 읽기 전용 유지 확인 (외부 인덱싱 URL grace period)
D+30  구 프로젝트 삭제
```

---

## 4. 변경 대상 파일

| 파일                                       | 변경 내용                                                  | 시점              |
| ------------------------------------------ | ---------------------------------------------------------- | ----------------- |
| `app/[locale]/layout.tsx:190,193`          | preconnect/dns-prefetch host → 환경변수 기반               | D-day 02:35       |
| `content/magazine-drafts/*.md`             | 30+ absolute Storage URL → 신규 host 일괄 치환             | D-day 02:35       |
| `app/api/internal/*/route.ts` (3개)        | MAINTENANCE_MODE early return 가드 추가                    | Day 2 (사전 머지) |
| `scripts/migration/cutover.sh`             | 신규 작성 (외부 문서 G 기반, saf2026 보정)                 | Day 2             |
| `scripts/migration/rewrite-project-ref.sh` | 신규 작성 (sed 기반 일괄 치환)                             | Day 2             |
| `scripts/migration/verify-*.js`            | 신규 작성 4종 (외부 문서 E 기반)                           | Day 2             |
| Vercel 환경변수                            | SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY 신규 ref로 교체 | D-day 02:30       |

---

## 5. 검증

### 자동 검증 (cutover.sh 내장)

| #   | 스크립트                  | 검증 내용                                      |
| --- | ------------------------- | ---------------------------------------------- |
| 1   | `verify-counts.js`        | 25개 테이블 + auth.users 행 수 일치            |
| 2   | `verify-content-hash.js`  | 핵심 테이블 SHA-256 (page_views는 sample hash) |
| 3   | `verify-storage.js`       | 2,429 objects path/size/etag 일치              |
| 4   | `verify-foreign-keys.sql` | FK 무결성 ERROR/WARNING 0건                    |
| 5   | pg_policies 비교          | count + name 배열 양쪽 일치                    |
| 6   | pg_extension 비교         | 활성 extension 목록 일치                       |

### 사이트 응답 검증 (curl)

```bash
curl -o /dev/null -s -w "%{http_code}" https://www.saf2026.com/        # → 200
curl -o /dev/null -s -w "%{http_code}" https://www.saf2026.com/artworks # → 200
```

### 이사장님 직접 점검 (03:15~03:30, 7개 항목)

1. 홈페이지 로딩 및 작품 이미지 정상 표시
2. 작품 상세 페이지 (이미지 + 작가 정보)
3. 결제 플로우 — Toss 결제창 오픈 (실결제 불필요)
4. 로그인 → admin 대시보드 접근
5. 작품 검색 / 필터링
6. 매거진 콘텐츠 (이미지 포함)
7. 모바일에서 전체 확인

### 사후 RUM / SEO 모니터링

- `admin/analytics` WebVitalsPanel — LCP/INP/CLS 추세 확인
- nav alert dot — RUM 회귀 즉시 감지
- GSC Search Console — D+1~D+30 crawl errors (구 Storage URL 404)

---

## 6. 권장 일정

| 시기                     | 내용                                      |
| ------------------------ | ----------------------------------------- |
| **6월**                  | 본 계획서 기반 scripts 최종 작성          |
| **7월 초**               | Day 1~4 실행 (서울 프로젝트 생성, 리허설) |
| **7월 중순 일요일 새벽** | Day 5 본 작업                             |
| **8월**                  | 안정화 + 모니터링                         |
| **9월**                  | 오윤 40주기 특별전 — 안정 상태로 진입     |

**왜 7월?** 5~6월은 개발 작업 충돌. 8월은 9월 특별전 직전이라 추가 이슈 발견 시 dead time 부족. 7월이 가장 안전한 window.

---

## 7. 미결 결정 항목

| 항목                         | 우선순위 | 비고                                        |
| ---------------------------- | -------- | ------------------------------------------- |
| pg_cron 사용 여부 확정       | 낮음     | Day 1 자동 확인                             |
| cutover 사령관 지정          | 중간     | 이사장님 가정 (외부 문서 기준)              |
| Toss 운영팀 사전 공지 여부   | 낮음     | Vercel route 불변이라 webhook URL 변경 없음 |
| 51명 사용자 이메일 공지 시점 | 중간     | D-3 또는 D-7                                |

---

## 참고

- [Supabase clone-project docs](https://supabase.com/docs/guides/platform/clone-project) — 같은 region 제약 명시 (자동 region 이전 불가 근거)
- [Migrating within Supabase](https://supabase.com/docs/guides/platform/migrating-within-supabase) — 수동 dump/restore 정공법
- 외부 컨설팅 문서: `~/Downloads/saf2026_supabase_migration_FINAL.md` — 방법론 채택, 사실은 본 문서로 보정
