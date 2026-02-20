# Cafe24 OAuth 연동 가이드

## 1) 환경변수

`/Users/hwang-gyeongha/saf/.env.local`에 아래 값을 설정합니다.

```env
CAFE24_MALL_ID=koreasmartcoop
CAFE24_CLIENT_ID=...
CAFE24_CLIENT_SECRET=...
CAFE24_REDIRECT_URI=https://saf2026.com/api/integrations/cafe24/callback
CAFE24_SCOPE=mall.read_product,mall.write_product
CAFE24_DEFAULT_CATEGORY_NO=43
```

## 2) 카페24 앱 설정

- Redirect URI(s)에 다음 주소를 등록해야 합니다.
  - `https://saf2026.com/api/integrations/cafe24/callback`
- Scope는 최소 `mall.read_product`, `mall.write_product`를 포함해야 합니다.

## 3) OAuth 시작 URL

브라우저에서 아래 주소로 접속하면 인증이 시작됩니다.

```text
https://saf2026.com/api/integrations/cafe24/authorize?return_to=/admin/artworks
```

- `return_to`는 인증 완료 후 돌아갈 내부 경로입니다. (기본값: `/admin/artworks`)

## 4) 추가된 라우트

- `/api/integrations/cafe24/authorize`
  - CSRF 방지용 `state` 생성 및 쿠키 저장
  - Cafe24 인가 페이지로 리다이렉트
- `/api/integrations/cafe24/callback`
  - `code`, `state` 검증
  - 토큰 교환
  - `public.cafe24_tokens` 테이블에 Access/Refresh 토큰 영구 저장
  - 성공 시 `?cafe24=connected`, 실패 시 `?cafe24=error&reason=...`로 리다이렉트

## 5) 현재 구현 상태

- Access/Refresh 토큰은 서버에서 HttpOnly 쿠키 + DB(`public.cafe24_tokens`)에 저장됩니다.
- Cafe24 Access Token 만료 시 Refresh Token으로 자동 갱신됩니다.
- 작품 등록/수정/이미지변경 시 Cafe24 상품 동기화를 자동 시도합니다.
  - 성공 시 `artworks.shop_url`, `artworks.cafe24_product_no`가 자동 반영됩니다.
  - 실패 시 `artworks.cafe24_sync_status`, `artworks.cafe24_sync_error`에 사유가 기록됩니다.
