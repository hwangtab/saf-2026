# CI 실패 수정 체크리스트

- [x] 원격 CI 실패 로그와 Playwright 리포트 원인 확인
- [x] 카트 데이터 조회와 테스트 seed 안정화
- [x] 카트/추도식 색 대비 및 `<dl>` 구조 수정
- [x] targeted a11y 및 정적 검증 실행
- [x] walkthrough 작성

---

# Google Merchant API 상품 동기화 체크리스트

- [x] Merchant API 공식 요구사항 확인
- [x] 한국어 실행계획을 `implementation_plan.md`에 추가
- [x] 작품 → Merchant `ProductInput` 매핑 테스트 추가
- [x] 판매 불가/가격 없음/이미지 없음 작품 제외 로직 추가
- [x] Merchant API REST client 추가
- [x] dry-run 기본 동기화 스크립트 추가
- [x] `--apply` 실제 insert/update 지원
- [x] `--delete-id` 특정 상품 delete 지원
- [x] `merchant:sync`, `merchant:sync:apply` npm script 추가
- [x] dry-run 리포트 생성 확인
- [x] 관련 테스트 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과
- [x] Merchant Center OAuth/env 설정 후 소수 상품 `--apply` 실행
- [x] 전체 판매 가능 상품 Merchant API 등록 실행

---

# GSC 잔존 개선사항 정리 체크리스트

- [x] GSC 감사 리포트 URL별 잔존 issue payload 확인
- [x] `implementation_plan.md`에 실행계획 기록
- [x] 작품 상세 Product/Merchant/FAQ rich-result 잔존 원인 회귀 테스트 추가
- [x] 작가 페이지 `mainEntity` 오류 회귀 테스트 추가
- [x] 현실 페이지 `Review` 오류 회귀 테스트 추가
- [x] P1/P2 schema 수정
- [x] 관련 테스트 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과
- [x] `walkthrough.md` 업데이트
- [x] GSC 관련 production 파일만 분리한 임시 worktree에서 preview 배포 생성
- [x] preview JSON-LD 샘플 검증
- [x] production 배포 완료
- [x] `saf2026.com`/`www.saf2026.com` production JSON-LD 샘플 검증
- [x] 이전 GSC issue URL 409개 production live HTML 전수 재검사
- [x] production live HTML 기준 잔존 schema 문제 0건 확인
- [x] Search Console API로 `https://www.saf2026.com/sitemap.xml` 재제출
- [x] in-app Playwright에서 GSC UI 접근 가능성 확인
- [x] 로그인된 Chrome에서 GSC UI 잔존 카운트 확인
- [x] GSC UI에서 Product snippets 주요 오류 수정 결과 확인 시작
- [x] GSC UI에서 Review snippets 오류 수정 결과 확인 시작
- [x] GSC UI에서 FAQ/Profile page 오류가 `문제 없음` 상태임을 확인
- [x] GSC UI에서 Image Metadata `creditText` 경고 수정 결과 확인 시작
- [x] Image Metadata `copyrightNotice` 수정 결과 확인 시작 상태 확인
- [ ] Google 재크롤 후 GSC 감사 스크립트 재실행

---

# GSC 개선사항 오류 전수 점검 체크리스트

- [x] GSC API URL Inspection 응답 구조 확인
- [x] Search Analytics 최근 28일 URL 수집 구현
- [x] sitemap URL 재귀 수집 구현
- [x] rich result issue grouping / priority mapping / route classification 구현
- [x] Markdown + JSON 리포트 생성 구현
- [x] 단위 테스트 추가
- [x] dry-run 검사 통과
- [x] 전체 865개 URL 감사 리포트 생성
- [x] retry URL 0개 확인
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과

---

# GSC 제품 스니펫 Product mention 오류 수정 체크리스트

- [x] GSC 오류 원인 후보 조사
- [x] 매거진 `BlogPosting.mentions`의 관련 작품 타입을 `Product`에서 `VisualArtwork`로 변경
- [x] `BlogPostingMention` 타입을 `VisualArtwork` 기준으로 정리
- [x] Product mention 회귀 테스트 추가
- [x] `npm test -- --runInBand __tests__/schemas/schema-validation.test.ts` 통과
- [x] `npm run type-check` 통과
- [x] `npm run lint` 통과

---

# 관리자 이메일 발송 UX 전면 재정리 체크리스트

- [x] `implementation_plan.md`에 전면 재정리 실행 계획 기록
- [x] `세그먼트 발송` / `검색 발송` 노출 제거
- [x] `받는 사람` 중심 섹션으로 재구성
- [x] `그룹 전체 선택` / `개별로 추가` 행동 기준 선택지로 변경
- [x] 명단에 없는 이메일 직접 추가 지원
- [x] 직접 입력 이메일 형식 오류/중복/이미 추가됨 요약 표시
- [x] `발송 예약` 문구를 `발송하기`로 변경
- [x] 성공 메시지를 발송 시작 기준으로 변경
- [x] 광고성 개별 발송에서 고객 마케팅 수신거부도 함께 제외
- [x] 테스트 버튼을 `나에게 테스트 보내기`로 변경
- [x] UI 문구 회귀 테스트 보강
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 관리자 이메일 작품 구매자 대상 검색 선택 체크리스트

- [x] `implementation_plan.md`에 작품 검색 선택 계획 기록
- [x] 웹사이트 작품 검색과 같은 `matchesAnySearch` 기반 서버 검색 액션 추가
- [x] 작품 ID 직접 입력을 실시간 작품 검색/선택 UI로 교체
- [x] 작품명/작가명 입력 후 300ms 디바운스 검색 적용
- [x] 선택된 작품 요약과 다시 선택 기능 추가
- [x] 작품 검색 선택 컴포넌트 테스트 추가
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 관리자 이메일 발송 UX 메인 반영 체크리스트

- [x] `implementation_plan.md`에 main 기준 UX 반영 계획 기록
- [x] 검색 발송 수신자 0명 발송 전 차단
- [x] 청원 미선택/작품 ID 미입력 발송 전 차단
- [x] 차단 사유 UI 표시
- [x] 검색 결과 0건 안내 표시
- [x] 선택 수신자 이름/이메일 검토 패널 추가
- [x] 선택 수신자 개별 해제와 전체 해제 추가
- [x] ContactSearch 회귀 테스트 보강
- [ ] `npm run lint` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가
- [ ] `npm run type-check` 실행
  - 현재 작업 환경에 `npm`이 없어 실행 불가

---

# 스토리 제목 하이픈 정리 체크리스트

- [x] 하이픈 포함 스토리 제목 조회
- [x] 실제 치환 대상 문자 확인
- [x] Supabase `stories` 제목 업데이트
- [x] 변경 후 결과 재조회
- [x] 재현용 SQL 마이그레이션 추가
- [x] `walkthrough.md` 업데이트

---

# 매거진 공통 하단 링크 단순화 체크리스트

- [x] 스토리 상세의 공통 하단 링크를 모든 게시물에 단순 인라인 형태로 통일
- [x] 작가 글/일반 글에 맞는 첫 번째 링크 문구 분기
- [x] 별도 footer 섹션 제거
- [x] 관련 작품 폴백 로직 단순화
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 작품 이미지 AI 업스케일 체크리스트

- [x] Supabase 기준 저해상도 대상 재집계
- [x] 업스케일 배치 스크립트 추가
- [x] 업스케일 보조 Python 스크립트 추가
- [x] 1순위 대상 dry-run 리포트 생성
- [x] 작품 이미지 백업 생성
- [x] 1순위 대상 업스케일 및 업로드 반영
- [x] Cafe24 동기화 결과 확인
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트

---

# 포털 진행바 rAF 충돌 수정 체크리스트

- [x] `components/layout/NavigationProgress.tsx`의 rAF/timer cleanup 보강
- [x] 연속 네비게이션 회귀 테스트 추가
- [x] 관련 테스트 실행
- [x] `npm run lint` 통과
- [x] `walkthrough.md` 업데이트

---

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

---

# 작품 상세 작가 관련 URL 확장 체크리스트

- [x] 현재 `artist-articles.ts` 보유 현황 파악
- [x] 출품 작가 대비 누락/공백 작가 집계
- [x] URL 중복 현황 확인
- [x] 동명이인 리스크 작가 식별
- [x] `implementation_plan.md`에 수집/검수/중복방지 계획 작성
- [x] 1차 배치 대상(0개/공백 작가) 확정
- [x] 작가별 검색 힌트 시트 작성
- [x] 후보 URL 수집
- [x] canonical URL 정규화 및 중복 제거
- [x] 동명이인 검수
- [x] `content/artist-articles.ts` 반영
- [x] 필요 시 `npm run lint`
- [x] 필요 시 `npm run type-check`
- [x] `walkthrough.md` 업데이트

---

# GSC/GA4 작품판매 매출 개선 체크리스트

- [x] 공통 판매 작품 스포트라이트 컴포넌트 추가
- [x] `/petition/oh-yoon`에 구매 가능한 오윤 판화 우선 노출
- [x] `/special/oh-yoon`에 checkout 신호 작품 우선 노출
- [x] 작가 페이지 hero 직후 구매 가능 작품/가격대 스포트라이트 추가
- [x] GSC 기회 매거진 글에 검색 의도형 작품 스포트라이트 추가
- [x] 국내/해외 checkout cancel/error 이벤트 추가
- [x] 환불/취소 제외 매출 RPC 마이그레이션 추가
- [x] 회귀 테스트 추가
- [x] 테스트/린트/type-check 실행
- [x] `walkthrough.md` 업데이트
