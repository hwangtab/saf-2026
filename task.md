# 이미지 업로드 장애 수정 체크리스트

- [x] CSP `img-src`에 `blob:` 허용 추가
- [x] 출품자 작품 업로드 `pathPrefix`를 artist id 기준으로 변경
- [x] Storage policy migration 작성(출품자 권한 추가)
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 최근 등록 검수 큐 개선 체크리스트

- [x] 대시보드 최근 작품 CTA를 `최근 등록 검수하기`로 변경
- [x] 대시보드 최근 작품 소스를 “작가 직접 등록” 기준으로 보강
- [x] `/admin/artworks?queue=artist-recent` 큐 모드 서버 필터 추가
- [x] 검수 큐 모드 상단 맥락 배지/안내/일반 목록 복귀 버튼 추가
- [x] 작품 목록에 등록일 정렬/등록일 컬럼 추가
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 최근 등록 정렬 필터 전환 체크리스트 (방향 변경)

- [x] 대시보드 CTA를 `/admin/artworks?sort=recent`로 변경
- [x] 작품 관리 페이지 `queue` 모드 제거
- [x] 작품 목록에 `기본/최근/오래된` 정렬 필터 추가
- [x] 정렬 필터를 URL `sort` 파라미터와 동기화
- [x] 대시보드 최근 작품 데이터 소스를 전체 최신 등록 기준으로 복원
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# Cafe24 초기 매핑 자동화 체크리스트

- [x] `scripts/cafe24/build_initial_mapping.py` 추가
- [x] `scripts/cafe24/README.md` 작성
- [x] `package.json`에 `cafe24:build-mapping` 스크립트 등록
- [x] `npm run cafe24:build-mapping` 실행 및 산출물 검증
- [x] `walkthrough.md`에 결과/잔여 과제 기록

---

# Cafe24 OAuth 콜백 라우트 체크리스트

- [x] `/api/integrations/cafe24/authorize` 라우트 추가
- [x] `/api/integrations/cafe24/callback` 라우트 추가
- [x] `.env.local.example`에 Cafe24 OAuth 환경변수 예시 추가
- [x] `docs/cafe24-oauth-integration.md` 사용 가이드 추가
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과

---

# Cafe24 자동 동기화 2단계 체크리스트

- [x] `public.cafe24_tokens` + 작품 동기화 메타 컬럼 마이그레이션 추가
- [x] Cafe24 API 클라이언트(토큰 refresh 포함) 구현
- [x] OAuth callback에서 토큰 DB 영구 저장 연동
- [x] 작품 등록/수정/이미지변경 액션에 Cafe24 자동 동기화 트리거 연결
- [x] `artworks` 동기화 상태(`cafe24_sync_status`, `cafe24_sync_error`) 기록 처리
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
