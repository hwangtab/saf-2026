# Cafe24 Review Resubmission Checklist

## 1) Pre-flight

- Ensure `CAFE24_CLIENT_ID`, `CAFE24_CLIENT_SECRET`, `CAFE24_REDIRECT_URI` are set.
- Ensure Redirect URI in Cafe24 developer center exactly matches `CAFE24_REDIRECT_URI`.
- Ensure requested scope is minimal and matches app behavior.

## 2) Launch Request Validation

- Valid launch request with `mall_id`, `timestamp`, `hmac` must redirect to Cafe24 authorize URL.
- Expired timestamp (> 2h) must return `400` with `timestamp_expired`.
- Invalid HMAC must return `403` with `hmac_mismatch`.
- Reused signed launch request must return `409` with `replayed_launch_request`.

## 3) OAuth Callback Validation

- Callback with valid `code` and `state` stores token for launch mall_id and returns completion page.
- Callback with `error` returns completion failure page (launch mode).
- Invalid or missing state returns `403`/`400` error response.
- Reused/consumed context returns `409` with `oauth_context_reused`.
- Expired context returns `400` with `expired_oauth_context`.

## 4) Internal Admin Reconnect Regression

- `/api/integrations/cafe24/authorize` without launch params still requires admin session.
- Internal reconnect flow still redirects back to admin page with status query.

## 5) Review-ready Artifacts

- Capture one successful install video from test mall.
- Capture one HMAC failure response screenshot.
- Capture one stale timestamp failure response screenshot.
- Include app test path (`개발자센터 > 앱 > 테스트 설치`) in reviewer notes.
