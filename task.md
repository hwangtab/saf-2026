# 이미지 업로드 장애 수정 체크리스트

- [x] CSP `img-src`에 `blob:` 허용 추가
- [x] 출품자 작품 업로드 `pathPrefix`를 artist id 기준으로 변경
- [x] Storage policy migration 작성(출품자 권한 추가)
- [x] `npm run lint` 통과
- [x] `npm run type-check` 통과
- [x] `walkthrough.md` 업데이트
