# Supabase 통합 및 마이그레이션 계획안

이 문서는 기존의 정적 파일 기반(`content/*.ts`) 시스템을 **Supabase(DB + Auth + Storage)** 기반의 동적 시스템으로 전환하기 위한 구체적인 실행 계획을 담고 있습니다.

## 1. 개요 및 목표

- **목표**: 작가가 직접 가입하여 본인의 프로필과 작품을 등록/관리하고, 관리자는 이를 승인 및 총괄 관리하는 시스템 구축.
- **핵심 변경 사항**:
  - **Data**: `TabS` 파일 -> `Supabase PostgreSQL`
  - **Auth**: 없음 -> `Supabase Auth` (Kakao/Google) + 관리자 승인제
  - **Image**: `public/images` -> `Supabase Storage`
  - **Admin**: `파일 수정` -> `Admin Dashboard` 웹 페이지

---

## 2. 데이터베이스 스키마 설계 (Database Schema)

### 2.1. Users & Profiles (`profiles`)

Supabase Auth의 `users` 테이블과 1:1로 매핑되는 사용자 정보 테이블입니다.

| 필드명       | 타입          | 설명                                                                 |
| :----------- | :------------ | :------------------------------------------------------------------- |
| `id`         | `uuid`        | PK, `auth.users.id` 참조                                             |
| `email`      | `text`        | 이메일                                                               |
| `name`       | `text`        | 사용자 이름 (작가명)                                                 |
| `role`       | `enum`        | `'admin'` (관리자), `'artist'` (작가), `'user'` (일반)               |
| `status`     | `enum`        | `'pending'` (승인대기), `'approved'` (승인됨), `'rejected'` (거절됨) |
| `avatar_url` | `text`        | 프로필 이미지 URL                                                    |
| `created_at` | `timestamptz` | 가입일                                                               |

### 2.2. 작가 정보 (`artists`)

작가에 대한 상세 정보를 담습니다. (현재 `artists-data.ts`)

| 필드명          | 타입   | 설명                         |
| :-------------- | :----- | :--------------------------- |
| `id`            | `uuid` | PK                           |
| `user_id`       | `uuid` | FK, `profiles.id` 참조 (1:1) |
| `name_ko`       | `text` | 작가명 (필수)                |
| `name_en`       | `text` | 작가명 (영문)                |
| `profile_image` | `text` | 프로필 사진 URL              |
| `bio`           | `text` | 작가 소개 (profile)          |
| `history`       | `text` | 작가 이력 (history)          |
| `contact_email` | `text` | 연락처 이메일                |
| `instagram`     | `text` | 인스타그램 링크              |
| `homepage`      | `text` | 홈페이지 링크                |

### 2.3. 작품 정보 (`artworks`)

개별 작품 정보를 담습니다. (현재 `saf2026-artworks.ts`)

| 필드명        | 타입          | 설명                                   |
| :------------ | :------------ | :------------------------------------- |
| `id`          | `uuid`        | PK                                     |
| `artist_id`   | `uuid`        | FK, `artists.id` 참조                  |
| `title`       | `text`        | 작품명                                 |
| `description` | `text`        | 작품 설명                              |
| `size`        | `text`        | 크기 (예: 60x45cm)                     |
| `material`    | `text`        | 재료                                   |
| `year`        | `text`        | 제작년도                               |
| `edition`     | `text`        | 에디션 정보                            |
| `price`       | `integer`     | 가격 (숫자로 저장, 표출시 포맷팅)      |
| `status`      | `enum`        | `'available'`, `'reserved'`, `'sold'`  |
| `is_hidden`   | `boolean`     | 숨김 처리 여부                         |
| `images`      | `text[]`      | 이미지 URL 배열 (첫번째가 대표 이미지) |
| `shop_url`    | `text`        | 구매 링크 (Cafe24 등)                  |
| `created_at`  | `timestamptz` | 등록일                                 |

### 2.4. 기타 콘텐츠

- **`news`**: 뉴스 기사 (`news.ts`)
- **`faq`**: FAQ (`faq.ts`)
- **`testimonials`**: 추천사 (`testimonials.ts`)
- **`videos`**: 영상 자료 (`videos.ts`)

---

## 3. 인증 및 권한 (Authentication & RLS)

### 3.1. 로그인 및 가입 프로세스

1. **소셜 로그인**: 카카오, 구글 로그인 지원.
2. **트리거(Trigger)**: `auth.users`에 신규 유저 생성 시, `public.profiles`에 자동으로 row 생성. 기본 `role='user'`, `status='pending'` 설정.
3. **승인 대기**: 로그인 후 대시보드 접근 시 `status` 확인. `'pending'`이면 "관리자 승인 대기 중입니다" 메시지 표시.
4. **관리자 승인**: 관리자가 Admin 페이지에서 `status`를 `'approved'`, `role`을 `'artist'`로 변경.
5. **작가 활동**: 승인된 작가는 자신의 `artists` 정보 생성 및 `artworks` 등록 가능.

### 3.2. RLS (Row Level Security) 정책

- **`profiles`**:
  - `SELECT`: 누구나 본인 정보 조회 가능. 관리자는 전체 조회 가능.
  - `UPDATE`: 본인 정보만 수정 가능. 관리자는 전체 수정 가능.
- **`artworks`**:
  - `SELECT`: `is_hidden`이 `false`인 경우 누구나 조회 (`public`).
  - `INSERT/UPDATE/DELETE`: `role`이 `'artist'`이면서 본인의 작품(`artist_id`)인 경우, 또는 `'admin'`인 경우 허용.

---

## 4. 스토리지 (Storage)

### 4.1. 버킷 구조

- **`artworks`**: 작품 이미지 저장 (`/artist_id/artwork_id/filename`)
- **`profiles`**: 작가 프로필 사진 (`/user_id/filename`)
- **`assets`**: 기타 에셋 (뉴스 썸네일 등)

### 4.2. 정책

- `SELECT`: `public` (누구나 조회 가능)
- `INSERT/UPDATE/DELETE`: 인증된 유저(Authenticated)만 가능하며, 본인 폴더 혹은 관리자만 가능하도록 정책 설정.

---

## 5. UI/UX 및 페이지 구조

### 5.1. Global

- **Header**: 로그인 상태에 따라 '로그인' -> '마이페이지/로그아웃' 버튼 변경.

### 5.2. Admin Dashboard (`/admin`)

- **접근 권한**: `role === 'admin'`
- **기능**:
  - **회원 관리**: 가입 승인 대기 목록, 승인/거절 처리, 권한 변경.
  - **콘텐츠 관리**: FAQ, 뉴스, 공지사항 등록 및 수정.
  - **전체 작품 관리**: 모든 작가의 작품 조회 및 수정/삭제 (중재자 역할).

### 5.3. Artist Dashboard (`/dashboard`)

- **접근 권한**: `role === 'artist'` (승인된 작가)
- **기능**:
  - **프로필 관리**: 작가 소개, 이력, 연락처 수정.
  - **작품 관리**: 내 작품 목록 조회, 신규 등록, 정보 수정, 판매 상태(`sold`) 변경.
  - **이미지 업로드**: 드래그 앤 드롭으로 작품 사진 업로드.

---

## 6. 마이그레이션 전략 (Migration)

### 1단계: Supabase 환경 세팅

1. 프로젝트 생성 및 환경변수(`.env.local`) 설정.
2. DB Table 및 RLS, Storage Bucket 생성 SQL 작성 및 실행.

### 2단계: 데이터 이관 스크립트 작성

기존 `.ts` 파일들을 파싱하여 Supabase DB에 넣는 Node.js 스크립트 작성 (`scripts/migrate-to-supabase.ts`).

1. **Storage**: `public/images` 폴더를 순회하며 Supabase Storage에 업로드하고 URL 획득.
2. **Artists**: `artists-data.ts`를 읽어 `profiles`와 `artists` 테이블에 Insert. (임의의 이메일/ID 생성 필요할 수 있음, 혹은 차후 로그인 시 매핑 전략 수립)
   - _전략_: 관리자가 미리 작가 계정(`profiles`)을 생성해두고 `artists` 데이터를 연결해두는 방식 권장.
3. **Artworks**: `saf2026-artworks.ts` 및 배치 파일들을 읽어 `artworks` 테이블에 Insert. 이때 이미지 경로는 위에서 업로드한 Storage URL로 교체.

### 3단계: 프론트엔드 전환

1. **API Client**: `lib/supabase/client.ts`, `server.ts` 생성.
2. **Fetch 로직 변경**:
   - `getArtworks()` 등 로컬 파일 읽는 함수를 Supabase `select` 쿼리로 대체.
   - React Server Component(RSC)를 최대한 활용하여 DB 직접 조회.

---

## 7. 실행 순서 (Action Plan)

1. **[설정]** Supabase 프로젝트 생성 및 연동 (`.env`).
2. **[DB]** DDL(테이블 생성) 및 RLS 정책 적용.
3. **[스크립트]** 데이터 마이그레이션 스크립트 작성 및 실행 (로컬 -> DB).
4. **[UI-공통]** 로그인/회원가입/헤더 UI 구현.
5. **[UI-관리자]** 어드민 대시보드(승인 기능) 구현.
6. **[UI-작가]** 작가 대시보드(작품 등록) 구현.
7. **[리팩토링]** 기존 메인 페이지 및 작품 리스트 페이지를 Supabase 데이터 기반으로 변경.
8. **[검증]** 배포 및 테스트.

---

## 8. 사용자(관리자) 확인 필요 사항

- 위 계획대로 **기존 데이터를 스크립트로 일괄 이관**하는 것을 우선 진행하겠습니다.
- 작가 계정 생성 시, 초기 데이터는 **'관리자 계정 하나로 모든 작품 소유'** 형태로 할지, 아니면 **'가상의 작가 계정들을 생성'**해서 할지 결정이 필요합니다.
  - _추천_: 일단은 **관리자가 모든 데이터를 소유**하거나, DB 상에만 존재하는 **Ghost User**에게 할당해두고, 추후 실제 작가가 가입하면 **관리자가 해당 작가에게 작품 소유권을 이전**해주는 기능(또는 수동 DB 매핑)을 사용하는 것이 현실적입니다.
