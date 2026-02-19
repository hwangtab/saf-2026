# 이미지 업로드 장애 수정 계획서

## 1) 목표

- 아티스트/출품자 작품 등록 화면에서 이미지 업로드가 정상 동작하도록 복구한다.
- 브라우저 CSP 차단(`blob:`)으로 발생하는 클라이언트 단계 실패를 해소한다.
- 출품자 계정의 Storage 업로드 권한/경로 불일치를 해결한다.

## 2) 확인된 원인

1. `img-src` CSP에 `blob:`이 없어, 업로드 전 이미지 최적화 단계(`URL.createObjectURL`)가 차단됨.
2. 출품자 작품 업로드 경로가 `exhibitor-artwork-{artworkId}`인데, `artworks` 버킷 정책은 기본적으로 아티스트 경로 규칙(artist id 폴더) 중심이라 권한 불일치가 발생함.

## 3) 구현 범위

### 포함

- `next.config.js` CSP의 `img-src`에 `blob:` 추가
- 출품자 작품 폼의 업로드 경로를 아티스트 ID 기반으로 정렬
- Supabase migration 추가: `artworks` Storage 정책에 `exhibitor(active)` + `artists.owner_id` 기반 권한 허용
- lint/type-check 수행

### 제외

- Vercel Analytics 설정 자체 변경
- 기존 업로드 파일의 대규모 경로 마이그레이션

## 4) 구현 단계

1. CSP 수정
2. 출품자 작품 업로드 경로 수정
3. Storage policy migration 추가
4. 정적 점검 및 타입 점검 실행
5. `walkthrough.md`에 결과 기록

## 5) 검증 계획

- `npm run lint`
- `npm run type-check`
- (가능 시) 출품자/아티스트 작품 수정 화면에서 이미지 1장 업로드 수동 확인

## 6) 완료 기준 (Definition of Done)

1. `blob:` CSP 차단 콘솔 에러가 사라진다.
2. 아티스트 계정으로 작품 이미지 업로드가 성공한다.
3. 출품자 계정으로 본인 소유 작가의 작품 이미지 업로드가 성공한다.
4. lint/type-check가 통과한다.

## 승인 상태

- 사용자 응답(“응”)에 따라 본 계획으로 즉시 실행.
