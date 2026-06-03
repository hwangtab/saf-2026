# 관리자 이메일 HQ — 운영 발송 트랙 (임의 주소 입력 + 목록 골라 발송) 설계

- **날짜**: 2026-06-03
- **상태**: 설계 승인 대기
- **선행**: [2026-06-02 템플릿·타겟팅·검색 발송](./2026-06-02-admin-email-templates-targeting-search-design.md) (PR #64, main 머지 완료)
- **유형**: 기존 라이브 `/admin/email` 확장 — **1차(운영 트랙)**. 마케팅 트랙은 별도 2차 스펙.

## 0. 맥락 — 왜 "운영"과 "마케팅"을 쪼개나 (리서치 결론)

요청: `/admin/email`을 **자유롭게 보내는 HQ**로 — 관리자가 **임의 주소를 입력**하거나 **목록에서 일부만 골라** 발송. 법률·도달률 리서치 결과, 이 자유는 **콘텐츠가 광고냐 아니냐**에 따라 완전히 다른 규칙을 받는다. 그래서 **투 트랙**으로 분리하고, 이 스펙은 **운영(비광고) 트랙만** 다룬다.

**근거 (요지):**

- **정통망법 §50**: 합법/위법을 가르는 것은 입력 방식이 아니라 **수신자의 동의·거래 상태 + 콘텐츠의 광고성**이다. **임의 주소에 1:few 운영·거래·협업 메일(판매 유도 없음)은 §50 적용 대상이 아니어서 합법.** 반대로 광고성(작품 판매·전시 홍보)을 동의 없는 제3자에게 보내면 위법(과태료 750만→3,000만원). **청원 서명자 11,668명은 마케팅 동의자가 아님** → 이들에게 광고 발송은 위법.
- **도달률/Resend**: Resend 약관은 **비동의·구매·타이핑 명단 대량 발송을 명시 금지**(위반 시 경고 없이 계정 정지). 불만율 임계 0.08%·반송 4%는 1.1만 명 기준 **스팸신고 12~35건**이면 초과. 게다가 broadcast가 **결제·주문 영수증과 같은 `saf2026.com` 도메인**이라 대량 발송 평판 손상이 **결제 메일 도달률까지 떨어뜨림**.
- **결론**: 콘텐츠가 운영성이어도 **대량(수백+)** 발송은 도달률·도메인 위험 → 마케팅 트랙(서브도메인·워밍업·중단장치)로. **운영 트랙은 소수(~수십, 최대 200) 비광고 발송**에 한정하면 합법·안전·경량.

## 1. 목표 / 비목표

### 목표 (운영 트랙)

`/admin/email`의 개별 발송(`individual` 채널)을 **"운영 발송" 모드**로 확장 — 수신자를 **3가지 방법**으로 만들어 같은 발송 경로로 보낸다:

1. **검색** — 보유 연락처 이름·이메일 검색 (기존 `ContactSearch`, 유지).
2. **목록 브라우즈** — 그룹(작가/출품자/청원별/구매자/회원)을 골라 페이지네이션된 목록을 보고 **체크박스로 일부 선택**.
3. **직접 입력** — 임의 이메일 주소를 **붙여넣기/타이핑**(쉼표·줄바꿈·세미콜론 구분, `이름 <메일>` 허용).

세 방법 모두 동일한 `selectedContacts: {email,name}[]`에 담겨 → 기존 `enqueueIndividualBroadcast`로 발송.

### 비목표 (= 2차 마케팅 트랙, 본 스펙 범위 밖)

- 광고성/판매 유도 발송, `(광고)` 표기 기반 마케팅
- 광고 수신 **동의자 명단 수집**(가입·청원 서명자 대상 옵트인 초대 등)
- 마케팅 전용 **서브도메인**(`news.saf2026.com`) 분리 + 도메인 인증
- 도메인 **워밍업**, engagement(90일 활성) 게이팅, **대량(수백+) 발송**
- RFC 8058 `List-Unsubscribe`/one-click 헤더, 발송 중 임계치 **자동 중단**
- 세그먼트 모드의 기존 광고 처리(고객 마케팅·작품구매자 광고 토글)는 **그대로 유지**(이미 법적 근거 있음)

## 2. 핵심 결정 (브레인스토밍 확정)

| 항목 | 결정 |
| --- | --- |
| 트랙 분리 | 운영(비광고) 1차 / 마케팅 2차 — **이 스펙은 운영만** |
| 구조 | 기존 개별 발송 모드를 **"운영 발송" 모드 + 수신자 빌더 3탭**으로 확장 (접근법 A) |
| 광고 토글 | **운영 모드에서 제거 — 비광고(`is_advertisement=false`) 강제.** 개별 채널 광고는 2차로 |
| 발송 규모 | **한 번에 최대 200명 하드 캡** + 초과 시 차단(2차 안내) |
| 도메인 | 소량 운영은 기존 `saf2026.com` 유지. 서브도메인 분리는 2차 |

## 3. 아키텍처

기존 단일 발송 파이프라인을 그대로 탄다. 세 수신자 빌더는 모두 **`{email,name}[]` 생산기**일 뿐이고, 종착지는 이미 구축된 `enqueueIndividualBroadcast`(channel=`individual`).

```
[운영 발송 모드]
  수신자 빌더 (탭)
   ├ 검색       → ContactSearch        ─┐
   ├ 목록 브라우즈 → ContactList (신규)   ─┼─→ selectedContacts: {email,name}[]
   └ 직접 입력   → parseEmailList (신규) ─┘            │
                                                       ▼
  제목/본문/CTA  →  enqueueIndividualBroadcast(비광고 강제, ≤200)
                                                       ▼
  email_broadcasts(channel='individual') + recipients → dispatch 크론(기존)
                                                       ▼
  suppression(individual+all) 차감 · 수신거부 토큰 (기존)
```

검증된 dispatch·suppression·수신거부·멱등 가드를 100% 재사용. 변경은 ① 수신자 빌더 2개 추가, ② enqueue 안전장치 보강, ③ 운영 모드 비광고 강제·캡 UI.

## 4. 컴포넌트 / 변경

### 신규

**`lib/email/parse-email-list.ts`** — 직접 입력 파서 (순수 함수, TDD 용이):

```ts
export interface ParsedEmail { email: string; name: string | null }
export function parseEmailList(raw: string): { valid: ParsedEmail[]; invalid: string[] }
```

- 구분자 `,` `;` 줄바꿈으로 토큰 분리, 각 토큰 trim.
- `이름 <a@x.com>` / `a@x.com` 형식 파싱(앵글 브래킷 안 주소 추출, 앞부분은 name).
- **`validateEmail`의 정규식을 재사용하되 throw 하지 않음** — 유효는 `valid`, 무효는 `invalid` 문자열로 분리(오타 하나로 전체 실패 방지). 정규식 단일 출처 유지를 위해 `lib/utils/input-validation.ts`에서 정규식을 export하거나 비-throw 검사 함수(`isValidEmail`)를 추가해 공유.
- 이메일 정규화(lowercase/trim) + dedup.

**`app/actions/admin-contact-search.ts`(또는 신규 모듈)에 `listAudienceRecipients`** — 목록 브라우즈 백엔드:

```ts
export async function listAudienceRecipients(
  channel: 'member' | 'customer' | 'petition' | 'artwork-buyer',
  filter?: { subset?; petitionSlug?; artworkId? },
  opts?: { query?: string; page?: number; pageSize?: number }
): Promise<{ recipients: { email: string; name: string | null }[]; total: number }>
```

- `requireAdmin` 가드. 기존 resolver(member/customer/petition/artwork-buyer)를 **그대로 재사용**해 `Recipient[]`(이미 suppression·dedup됨)를 얻고, `{email,name}`로 매핑(emailHash·locale는 클라이언트로 누출 금지).
- 선택적 `query`로 이름·이메일 in-memory 필터, `page`/`pageSize`로 페이지네이션.
- resolver 선택 switch는 `enqueueBroadcast`·`previewAudience`·이 액션 3곳에서 중복되므로 **`resolverFor(channel, filter)` 헬퍼로 추출**해 단일 출처화.

**`app/(portal)/admin/email/_components/ContactList.tsx`** — 목록 + 체크박스 UI:

- 그룹 select(작가/출품자/청원별 드롭다운/작품구매자/고객), 페이지네이션, 이름검색 입력.
- 행별 체크박스 + "이 페이지 전체 선택/해제". 체크한 행을 `ContactSearch`와 **동일한 `selected/onChange` 계약**으로 부모의 `selectedContacts`에 반영. 칩 UI는 ContactSearch와 공유(공통 칩 컴포넌트로 추출 가능).

### 수정

**`app/(portal)/admin/email/_components/BroadcastForm.tsx`**:

- 모드 라벨: `'search'` → "운영 발송"(개념은 동일, individual 채널). 세그먼트 모드 무변경.
- 운영 모드 안에 **수신자 빌더 탭 3개**(검색 / 목록 / 직접 입력) — 전부 `selectedContacts` 갱신.
- **`searchAdvertising` 토글 제거** → 운영 발송은 `isAdvertisement: false` 고정. (광고는 2차)
- 직접 입력 탭: textarea + `parseEmailList` → 유효 담기, **무효 N건 표시**.
- 발송 직전 **`selectedContacts.length > 200` 이면 차단** + "대량은 추후 마케팅 발송으로" 안내. 발송 버튼도 `disabled`.
- suppression 자동 제외 결과를 "**N명 수신거부로 제외됨**"으로 결과 메시지에 노출(enqueue 반환에 dropped 수 포함).

**`app/actions/admin-broadcast.ts` `enqueueIndividualBroadcast`** — 안전장치 보강:

- **서버측 이메일 형식 검증**: recipients를 `validateEmail`(비-throw 변형 또는 try/catch)로 필터 — 잘못된 주소가 Resend로 가는 구멍 차단. 무효는 제외하고 dropped 카운트에 반영.
- **200명 하드 캡** 서버에서도 강제(클라이언트 우회 방지): 초과 시 `{ error: true, message: '운영 발송은 한 번에 200명까지입니다.' }`.
- **멱등 가드 보완**: 현재 `(created_by, channel='individual', subject)` 5분 기준 → 다른 명단을 같은 제목으로 연속 발송 시 2번째 묵살. **정규화된 수신자 이메일 셋의 해시를 가드 키에 포함**(같은 제목+다른 명단은 통과, 같은 제목+같은 명단 더블클릭만 차단). `audience_filter`에 `recipient_hash` 저장 또는 가드 쿼리에 반영.
- 반환에 `droppedCount`(suppression+무효 제외 수) 포함해 UI가 표기.

## 5. UI 스케치

```
┌ 발송 모드: ○ 그룹 발송   ● 운영 발송(개별·비광고) ─────────┐
│ 수신자 만들기: [ 검색 ] [ 목록 브라우즈 ] [ 직접 입력 ]      │
│  · 검색  : (기존 ContactSearch)                              │
│  · 목록  : [그룹▼] [이름검색] ─ 행 ☑ ─ "페이지 전체" ─ ◀ N/▶ │
│  · 직접  : ┌textarea: a@x.com, 홍길동 <b@y.com> …┐ → 유효 5 │
│            └────────────────────────────────────┘   무효 1 │
│ 담긴 수신자 12명  (칩 ×)   · 발송 시 수신거부 2명 자동 제외  │
│ 제목 / 본문(마크다운·{{name}}) / CTA(선택)                  │
│ [나에게 테스트 발송]   ☑ 발송 확정   [발송]  (>200 차단)     │
└─────────────────────────────────────────────────────────────┘
```

## 6. 테스트 전략

- **단위**: `parseEmailList`(구분자·`이름<메일>`·무효 분리·dedup·정규화), `resolverFor`(채널→resolver 매핑), `listAudienceRecipients`(resolver 위임·페이지네이션·이름필터), enqueue 서버측 `validateEmail` 필터·200 캡·멱등 해시 가드.
- **컴포넌트(RTL)**: 직접입력 탭 파싱→담기, 목록 체크→담기, 200 초과 시 발송 비활성, 운영 모드에 광고 토글 없음.
- **회귀**: 기존 세그먼트·검색·테스트발송·dispatch 테스트 무손상. `npm test`·`type-check`·`lint`·`build`.

## 7. 파일 변경 맵

**신규**: `lib/email/parse-email-list.ts`, `app/(portal)/admin/email/_components/ContactList.tsx`, (헬퍼) `lib/email/audiences/resolver-for.ts`, 테스트 다수.
**수정**: `app/actions/admin-broadcast.ts`(`listAudienceRecipients` 추가·`enqueueIndividualBroadcast` 보강·`resolverFor` 사용), `app/(portal)/admin/email/_components/BroadcastForm.tsx`(운영 모드 3탭·비광고 강제·캡), `lib/utils/input-validation.ts`(비-throw `isValidEmail` 또는 정규식 export).

## 8. 리스크 / 주의

- **운영 ≠ 무제한**: 200 캡은 도달률·도메인 보호의 핵심. 캡을 키우자는 요구가 오면 그건 마케팅 트랙(서브도메인) 신호.
- **직접 입력의 개인정보 출처**: 임의 주소 입력은 §50 밖이어도, 개인정보보호법상 수집 출처·이용 범위는 관리자 책임 — UI에 가벼운 주의 문구 권장.
- **콘텐츠 광고성 혼입 금지**: 운영 모드 본문에 작품 구매·판매 유도가 섞이면 광고성으로 끌려감 — 운영 모드는 비광고 전제임을 UI에 명시.
- 스키마 변경 없음(`individual` 채널·`audience_filter` jsonb 재사용). 마이그레이션 불필요.
