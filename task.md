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
