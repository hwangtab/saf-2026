# 관리자 기능 고도화 계획서

> **작성일**: 2026-02-06
> **목적**: SAF 2026 관리자 시스템의 기능을 확장하여 운영 효율성을 극대화합니다.

---

## 1. 현재 상태 분석

### ✅ 이미 구현된 기능

| 기능                                 | 위치                            | 상태    |
| ------------------------------------ | ------------------------------- | ------- |
| 사용자 목록 조회                     | `/admin/users`                  | ✅ 완료 |
| 작가 승인/거절                       | `app/actions/admin.ts`          | ✅ 완료 |
| 사용자 권한 변경 (user/artist/admin) | `app/actions/admin.ts`          | ✅ 완료 |
| 작품 목록 조회                       | `/admin/artworks`               | ✅ 완료 |
| 작품 상태 변경 (판매중/예약/완료)    | `app/actions/admin-artworks.ts` | ✅ 완료 |
| 작품 숨김/노출 변경                  | `app/actions/admin-artworks.ts` | ✅ 완료 |
| 작품 삭제                            | `app/actions/admin-artworks.ts` | ✅ 완료 |
| 콘텐츠 관리 (뉴스/FAQ/동영상/후기)   | `/admin/content/*`              | ✅ 완료 |

### ❌ 누락된 기능

| 기능                 | 우선순위 | 설명                       |
| -------------------- | -------- | -------------------------- |
| 작가 프로필 수정     | 🔴 높음  | 작가명, 소개, 이력 등 수정 |
| 작품 이미지 재업로드 | 🔴 높음  | 잘못된 이미지 교체         |
| 작품 상세 정보 수정  | 🔴 높음  | 제목, 가격, 재료, 크기 등  |
| 대시보드 통계        | 🟡 중간  | 총 작가/작품/판매 현황     |
| 가입 신청 상세 보기  | 🟡 중간  | 모달로 자세히 확인         |
| 활동 로그            | 🟢 낮음  | 관리자 액션 기록           |
| 일괄 작업            | 🟢 낮음  | 다수 작품 상태 일괄 변경   |

---

## 2. 고도화 구현 계획

### Phase 1: 핵심 관리 기능 (🔴 높음)

#### 2.1 작가 프로필 관리

**목표**: 관리자가 작가의 모든 정보를 수정할 수 있도록 합니다.

```
📁 app/admin/artists/
├── page.tsx              # 작가 목록
├── [id]/
│   └── page.tsx          # 작가 상세/수정 페이지
└── artist-list.tsx       # 클라이언트 컴포넌트

📁 app/actions/
└── admin-artists.ts      # 서버 액션 (NEW)
```

**서버 액션 (`admin-artists.ts`)**:

- `getArtists()`: 모든 작가 목록 조회
- `getArtist(id)`: 작가 상세 정보 조회
- `updateArtist(id, data)`: 작가 정보 수정
  - `name_ko`, `name_en`, `bio`, `history`, `profile_image`, `contact_email`
- `deleteArtist(id)`: 작가 삭제 (연결된 작품도 처리 필요)

**UI 기능**:

- 작가 목록에서 검색/필터링
- 작가별 등록 작품 수 표시
- 작가 상세 페이지에서 모든 필드 수정 가능
- 프로필 이미지 재업로드

---

#### 2.2 작품 이미지 재업로드

**목표**: 잘못 업로드된 이미지를 관리자가 교체할 수 있도록 합니다.

```
📁 app/admin/artworks/
├── [id]/
│   └── page.tsx          # 작품 상세/수정 페이지 (NEW)
└── artwork-edit-form.tsx # 수정 폼 컴포넌트 (NEW)
```

**서버 액션 추가 (`admin-artworks.ts`)**:

- `updateArtworkImages(id, images)`: 이미지 배열 변경
- `uploadArtworkImage(artworkId, file)`: 새 이미지 업로드
- `deleteArtworkImage(artworkId, imageUrl)`: 특정 이미지 삭제

**UI 기능**:

- 현재 이미지 미리보기 (드래그로 순서 변경)
- 개별 이미지 삭제 버튼
- 새 이미지 업로드 (다중 선택)
- 대표 이미지 지정

---

#### 2.3 작품 상세 정보 수정

**목표**: 관리자가 작품의 모든 필드를 수정할 수 있도록 합니다.

**수정 가능 필드**:
| 필드 | 타입 | 비고 |
|------|------|------|
| `title` | text | 작품명 |
| `description` | text | 작품 설명 |
| `size` | text | 크기 (예: 60x45cm) |
| `material` | text | 재료 |
| `year` | text | 제작연도 |
| `edition` | text | 에디션 정보 |
| `price` | text | 가격 (₩ 형식) |
| `shop_url` | text | Cafe24 상품 URL |
| `artist_id` | uuid | 작가 변경 (드롭다운) |

**서버 액션 추가**:

- `updateArtworkDetails(id, data)`: 작품 상세 정보 수정

---

### Phase 2: 운영 편의 기능 (🟡 중간)

#### 2.4 관리자 대시보드 통계

**목표**: 한눈에 현황을 파악할 수 있는 대시보드를 제공합니다.

```
📁 app/admin/
└── dashboard/
    └── page.tsx          # 통계 대시보드 (NEW)
```

**표시 항목**:

- **작가 현황**
  - 전체 작가 수
  - 승인 대기 중인 작가 수
  - 정지된 작가 수
- **작품 현황**
  - 전체 작품 수
  - 판매 중 / 예약 / 판매 완료 비율
  - 숨김 처리된 작품 수
- **최근 활동**
  - 최근 가입 신청 5건
  - 최근 등록된 작품 5건

**차트 라이브러리**: 기존 프로젝트에 맞게 선택 (recharts 또는 chart.js)

---

#### 2.5 가입 신청 상세 모달

**목표**: 가입 신청 정보를 모달로 자세히 확인할 수 있도록 합니다.

**현재 문제**:

- 신청 정보가 목록에서 잘려서 표시됨
- 긴 소개글을 전체 확인하기 어려움

**개선 UI**:

- 사용자 클릭 시 모달 팝업
- 작가명, 연락처, 소개 전문 표시
- 승인/거절 버튼 포함
- 이전 신청 이력 표시 (있는 경우)

---

### Phase 3: 고급 기능 (🟢 낮음)

#### 2.6 활동 로그

**목표**: 관리자 액션을 기록하여 추적 가능하게 합니다.

**데이터베이스 테이블 추가**:

```sql
create table public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id),
  action text not null,
  target_type text, -- 'user', 'artwork', 'artist', 'content'
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);
```

**기록 항목**:

- 사용자 승인/거절
- 권한 변경
- 작품 수정/삭제
- 작가 정보 수정
- 콘텐츠 수정

---

#### 2.7 일괄 작업

**목표**: 다수의 작품을 한 번에 처리할 수 있도록 합니다.

**기능**:

- 체크박스로 다중 선택
- 일괄 상태 변경 (판매 중 → 판매 완료)
- 일괄 숨김/노출 변경
- 일괄 삭제 (확인 절차 포함)

---

## 3. 데이터베이스 변경 사항

### 필요한 마이그레이션

```sql
-- 1. artists 테이블에 연락처 필드 확인
-- (이미 contact_email 존재)

-- 2. 활동 로그 테이블 (Phase 3)
create table public.admin_logs (
  id uuid default gen_random_uuid() primary key,
  admin_id uuid references public.profiles(id),
  action text not null,
  target_type text,
  target_id text,
  details jsonb,
  created_at timestamptz default now()
);

-- RLS 정책
alter table public.admin_logs enable row level security;
create policy "Only admins can view logs" on public.admin_logs
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

---

## 4. 파일 구조 변경 예상

```
📁 app/admin/
├── layout.tsx                    # 기존
├── dashboard/
│   └── page.tsx                  # NEW: 통계 대시보드
├── users/
│   ├── page.tsx                  # 기존
│   └── user-list.tsx             # 기존 (모달 추가)
├── artists/                      # NEW: 작가 관리
│   ├── page.tsx
│   ├── [id]/
│   │   └── page.tsx
│   └── artist-list.tsx
├── artworks/
│   ├── page.tsx                  # 기존
│   ├── [id]/
│   │   └── page.tsx              # NEW: 작품 상세 수정
│   ├── admin-artwork-list.tsx    # 기존
│   └── artwork-edit-form.tsx     # NEW
├── content/                      # 기존
│   └── ...
└── logs/                         # NEW: 활동 로그 (Phase 3)
    └── page.tsx

📁 app/actions/
├── admin.ts                      # 기존
├── admin-artworks.ts             # 기존 (확장)
├── admin-artists.ts              # NEW
└── admin-logs.ts                 # NEW (Phase 3)
```

---

## 5. 구현 일정 (예상)

| Phase       | 기능                 | 예상 소요 |
| ----------- | -------------------- | --------- |
| **Phase 1** | 작가 프로필 관리     | 2-3시간   |
|             | 작품 이미지 재업로드 | 2-3시간   |
|             | 작품 상세 정보 수정  | 1-2시간   |
| **Phase 2** | 관리자 대시보드 통계 | 2시간     |
|             | 가입 신청 상세 모달  | 1시간     |
| **Phase 3** | 활동 로그            | 2-3시간   |
|             | 일괄 작업            | 2시간     |

**총 예상 소요 시간**: 12-16시간

---

## 6. 우선순위 권장 순서

1. ✅ **작품 상세 정보 수정** (가장 시급, 기존 코드 확장)
2. ✅ **작품 이미지 재업로드** (기존 Storage 로직 활용)
3. ✅ **작가 프로필 관리** (새 페이지 필요)
4. **관리자 대시보드 통계** (운영 편의)
5. **가입 신청 상세 모달** (UX 개선)
6. **활동 로그** (감사 추적)
7. **일괄 작업** (효율성)

---

## 7. 승인 요청

이 계획서의 Phase 1부터 순차적으로 구현을 진행해도 될까요?
특정 기능의 우선순위를 변경하거나 추가할 기능이 있다면 알려주세요.
