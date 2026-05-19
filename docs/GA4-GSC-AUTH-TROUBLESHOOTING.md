# GA4 + GSC Service Account 인증 삽질 회고록

> 작성일: 2026-05-18
> 목적: 같은 함정에 다시 빠지지 않기 위한 post-mortem. 셋업 how-to는 [ANALYTICS-SETUP-GUIDE.md](./ANALYTICS-SETUP-GUIDE.md) 참조.

---

## TL;DR — 4가지 핵심 함정

1. **GA4는 SA를 Property 사용자로 먼저 추가해야 한다.** 안 하면 `403 PERMISSION_DENIED`. SA 키가 있다고 자동으로 권한이 생기지 않는다.
2. **GSC UI는 SA 이메일을 사람 계정으로 인식하지 못한다.** Site Verification API + `PUT /webmasters/v3/sites` 2단계가 유일한 방법이다.
3. **`verificationMethod: "DNS_TXT_RECORD"` 는 틀린 값이다.** API가 받는 올바른 값은 `"DNS_TXT"`.
4. **Vercel `env pull`이 `""`를 보여줘도 실제 값은 있다.** 암호화 값은 항상 마스킹 표시된다.

---

## 1. GA4 인증 — Service Account vs OAuth refresh token

### 증상

```
403 PERMISSION_DENIED
"User does not have sufficient permissions for this property."
```

`GA4_SERVICE_ACCOUNT_KEY`를 `.env.local`에 올바르게 넣었는데도 이 에러가 뜬다.

### 원인

SA 이메일이 GA4 Property의 "사용자 관리"에 추가되어 있지 않기 때문이다. GSC는 Site Verification API로 SA 등록이 가능하지만, **GA4는 API 우회 방법이 없다.** Property 관리자 계정(hwangtab@gmail.com)이 직접 GA4 > 관리 > 속성 액세스 관리에서 SA 이메일을 추가해야 한다.

### 현재 작동 방식 (OAuth fallback)

`scripts/lib/ga4-auth.js`는 SA → OAuth refresh → dev token 순으로 fallback한다.

```javascript
// 우선순위 1: Service Account
if (process.env.GA4_SERVICE_ACCOUNT_KEY) { ... }

// 우선순위 2: OAuth refresh token (자동 갱신, 만료 없음)
if (process.env.GA4_OAUTH_CLIENT_ID && process.env.GA4_OAUTH_REFRESH_TOKEN) { ... }

// 우선순위 3: access_token 직접 (1시간 만료, 로컬 임시용)
if (process.env.GA4_ACCESS_TOKEN) { ... }
```

`.env.local`에 `GA4_OAUTH_CLIENT_ID`, `GA4_OAUTH_CLIENT_SECRET`, `GA4_OAUTH_REFRESH_TOKEN` 3개가 설정되어 있으면 SA 없이도 영구적으로 작동한다. **refresh token은 사용자가 직접 취소하지 않는 한 만료되지 않는다.**

> ⚠️ 과거 메모에 "1시간짜리 access_token 수동 갱신"이라고 적혀 있었는데, refresh token을 이용한 자동 갱신이므로 사실이 아니다.

### 해결책 (SA를 쓰고 싶다면)

1. [GA4 콘솔](https://analytics.google.com) > 관리 > 속성 > 속성 액세스 관리
2. "+" 버튼 > `GA4_SERVICE_ACCOUNT_KEY`의 `client_email` 값 입력
3. 권한: "조회자" 이상 부여
4. 이후 `scripts/lib/ga4-auth.js`의 SA 분기가 정상 작동

### 참조 파일

- [scripts/lib/ga4-auth.js](../scripts/lib/ga4-auth.js) — SA > OAuth > dev token 우선순위 로직
- [scripts/ga4-grant-sa-access.js](../scripts/ga4-grant-sa-access.js) — SA 권한 진단 헬퍼

---

## 2. GSC 인증 — Site Verification API 우회 패턴

### 증상 1: UI에서 SA 이메일 추가 불가

GSC UI > 설정 > 사용자 및 권한 > 사용자 추가에서 SA 이메일(`xxx@xxx.iam.gserviceaccount.com`)을 입력하면:

```
사용자 추가 실패: 이메일 찾을 수 없음
```

**GSC UI는 구글 계정(사람)만 받는다.** SA 이메일은 Google Workspace 계정이 아니라서 UI 경로로는 추가 불가능하다.

### 증상 2: Site Verification API 403

SA로 직접 Site Verification API를 호출하면:

```
403 Site Verification API has not been used in project ... before or it is disabled.
```

GCP Console에서 `siteverification.googleapis.com`을 활성화해야 한다.

- [활성화 링크](https://console.developers.google.com/apis/api/siteverification.googleapis.com/overview?project=104389097540) (프로젝트 ID: 104389097540)

### 증상 3: DNS_TXT_RECORD → 400 invalid argument

```javascript
// ❌ 틀림
verificationMethod: 'DNS_TXT_RECORD';

// ✅ 맞음
verificationMethod: 'DNS_TXT';
```

Google 공식 문서의 valid 값: `DNS_TXT`, `DNS_CNAME`, `FILE`, `META`, `ANALYTICS`, `TAG_MANAGER`.  
`_RECORD` suffix를 붙이면 즉시 400.

### 증상 4: Verification 후 sites.list 비어있음

```javascript
// Site Verification 완료 후
const sites = await fetch('/webmasters/v3/sites');
// → { "siteEntry": [] }  // 비어있음!
```

**Site Verification API는 도메인 소유권만 확인한다.** GSC에 사이트로 등록되지는 않는다. 별도로 PUT 요청이 필요하다.

```javascript
// sc-domain:saf2026.com → URL encode → sc-domain%3Asaf2026.com
const scDomainUrl = `sc-domain:${DOMAIN}`;
await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(scDomainUrl)}`, {
  method: 'PUT',
  headers: { Authorization: `Bearer ${accessToken}` },
});
// 204 No Content → siteOwner 등록 완료
```

### 전체 정상 동작 절차

```
1. GCP Console: Site Verification API 활성화
   ↓
2. SA JWT로 access_token 발급 (scope: siteverification)
   ↓
3. POST /siteVerification/v1/token
   Body: { site: { type: "INET_DOMAIN", identifier: "saf2026.com" }, verificationMethod: "DNS_TXT" }
   → 받은 토큰을 도메인 DNS TXT 레코드에 추가
   ↓
4. DNS 전파 확인 후:
   POST /siteVerification/v1/webResource?verificationMethod=DNS_TXT
   Body: { site: { type: "INET_DOMAIN", identifier: "saf2026.com" } }
   → 200 성공 = 소유권 확인 완료
   ↓
5. PUT /webmasters/v3/sites/sc-domain%3Asaf2026.com
   (scope에 webmasters 추가 필요)
   → 204 성공 = GSC 사이트 등록 + SA를 siteOwner로 등록
   ↓
6. GET /webmasters/v3/sites 로 확인
   → siteEntry 에 sc-domain:saf2026.com 항목 + permissionLevel: siteOwner 확인
```

### 참조 파일

- [scripts/gsc-grant-sa-access.js](../scripts/gsc-grant-sa-access.js) — 위 절차 구현체 (subcommand: `token`, `verify`, `list`)

---

## 3. Vercel 환경 함정

### 함정 A — Hobby 플랜 serverless 10초 타임아웃

GSC API에서 7일치 데이터를 순차 fetch하면 약 21초 걸린다. Vercel Hobby 플랜 serverless function 최대 실행 시간은 10초. 결과:

```
FUNCTION_INVOCATION_TIMEOUT
HTTP 504
```

SA 인증 자체는 정상 작동 중이었다. auth fail이 아니라 duration cap이 원인이었다.

**해결**: Vercel cron → GitHub Actions로 이전. GitHub Actions는 타임아웃 제약 없음.

- [.github/workflows/gsc-sync.yml](../.github/workflows/gsc-sync.yml) — 매일 05:00 KST 자동 실행 + `workflow_dispatch.daysBack` 파라미터로 백필 가능
- `vercel.json`의 `/api/internal/gsc-sync` cron 엔트리 제거 (중복 방지)
- API route 자체(`app/api/internal/gsc-sync/route.ts`)는 유지 — 수동 테스트·디버깅용

### 함정 B — `vercel env pull`의 `""` 마스킹

```bash
vercel env pull .env.local
# 결과:
# GSC_SERVICE_ACCOUNT_KEY=""   ← 비어있는 것처럼 보임
```

**암호화된 env 값은 `vercel env pull`이 항상 `""`로 출력한다.** 실제 비어있는 게 아니다. 이걸 보고 "값이 없구나"라고 판단하고 재등록하면 시간 낭비다.

값의 실제 존재 여부는 production에서 직접 호출해서 에러 타입으로 판단해야 한다.

- `401 Unauthorized` → 값이 없거나 잘못된 값
- `403 PERMISSION_DENIED` → 값은 있지만 권한 없음 (SA가 리소스에 등록 안 됨)
- `504 Timeout` → 값은 정상, 실행 시간 초과

### 함정 C — `vercel deploy --archive=tgz` 로 해결 안 되는 것들

파일 15,000개 제한은 `--archive=tgz`로 우회되지만, build 중 `sync-site-stats.js`가 DB 연결 없이 실패하면 전체 배포가 실패한다.

그리고 **env 변수를 추가·수정한 후에는 재배포가 불필요하다.** Vercel serverless는 runtime에 env를 읽는다. 배포 없이 env만 수정하면 다음 요청부터 새 값이 적용된다.

### 함정 D — Vercel preview env branch-scoped 함정

Vercel CLI로 배포할 때는 branch-scoped preview env가 적용되지 않는다. preview env는 반드시 "All Previews"로 등록해야 한다. (관련 메모: `project_vercel_preview_env.md`)

---

## 4. Supabase 연결 — 521/522 Cloudflare 오류

### 증상

```
TypeError: fetch failed
```

또는 Supabase에서 HTML이 응답으로 오고 내용이:

```html
<title>supabase.co | 522: Connection timed out</title> <title>521: Web server is down</title>
```

### 원인

Supabase 프로젝트 자체가 일시적으로 내려간 상태. MCP `get_project` 결과가 `status: "ACTIVE_HEALTHY"`이어도 Cloudflare 경로가 끊겨있는 경우가 있다.

### 대응 절차

1. `mcp__claude_ai_Supabase__execute_sql`로 간단한 쿼리 핑 테스트:
   ```sql
   SELECT 1;
   ```
2. 응답 오면 정상 → backfill 스크립트 재실행 (idempotent하므로 안전)
3. 응답 없으면 → DB 재시작 필요 (Supabase 대시보드 > Settings > Infrastructure)
4. 5~10분 대기 후 재시도

backfill/upsert 스크립트는 `onConflict: 'date,query,page'`로 idempotent하게 작성되어 있어서, 같은 날짜를 중복 실행해도 안전하다.

---

## 5. 체크리스트 — 다시 빠지지 말 것

**GA4:**

- [ ] SA를 쓰고 싶다면 → GA4 Property 사용자 관리에 SA 이메일 + 조회자 권한 선추가
- [ ] `.env.local`에 `GA4_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN` 있으면 SA 없어도 작동
- [ ] SA 403이 나면 "키가 틀렸나"가 아니라 "Property에 권한이 있나" 먼저 확인

**GSC:**

- [ ] GSC UI에서 SA 추가 시도하지 말 것 → Site Verification API + `sites.add` 2단계 필수
- [ ] API disabled 에러 → GCP Console에서 `siteverification.googleapis.com` 활성화
- [ ] `verificationMethod`는 반드시 `"DNS_TXT"` (후위에 `_RECORD` 붙이지 말 것)
- [ ] Verification 후 `PUT /webmasters/v3/sites/{encoded}` 한 번 더 호출해야 GSC 등록 완료

**Vercel:**

- [ ] `vercel env pull`의 `""` 출력을 빈 값으로 착각하지 말 것
- [ ] 장시간 작업(10초 이상)은 Vercel cron 대신 GitHub Actions
- [ ] env 수정 후 재배포 불필요

**Supabase:**

- [ ] `TypeError: fetch failed`나 HTML 응답 오면 522/521 확인 → 핑 테스트 후 재시도
- [ ] `ACTIVE_HEALTHY` 상태여도 Cloudflare 경로 끊길 수 있음

---

## 6. 관련 파일 맵

| 파일                                                                        | 역할                                        |
| --------------------------------------------------------------------------- | ------------------------------------------- |
| [scripts/lib/ga4-auth.js](../scripts/lib/ga4-auth.js)                       | GA4 인증 공유 모듈 (SA > OAuth > dev token) |
| [scripts/ga4-grant-sa-access.js](../scripts/ga4-grant-sa-access.js)         | GA4 SA 권한 진단                            |
| [scripts/gsc-grant-sa-access.js](../scripts/gsc-grant-sa-access.js)         | GSC SA 등록 (Site Verification + sites.add) |
| [.github/workflows/gsc-sync.yml](../.github/workflows/gsc-sync.yml)         | GSC 일일 sync + 백필 (GitHub Actions)       |
| [app/api/internal/gsc-sync/route.ts](../app/api/internal/gsc-sync/route.ts) | GSC sync API endpoint (수동 테스트용)       |
| [docs/ANALYTICS-SETUP-GUIDE.md](./ANALYTICS-SETUP-GUIDE.md)                 | GA4 + GSC 초기 셋업 how-to                  |
