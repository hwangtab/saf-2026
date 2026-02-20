# Cafe24 초기 매핑 자동화

`scripts/cafe24/build_initial_mapping.py`는 기존 일괄등록 CSV(`docs/cafe24-products-*.csv`)를 기준으로
초기 매핑과 이미지 업로드 준비 산출물을 생성합니다.

## 실행

```bash
python3 scripts/cafe24/build_initial_mapping.py
```

옵션:

```bash
python3 scripts/cafe24/build_initial_mapping.py \
  --input-glob "docs/cafe24-products-*.csv" \
  --image-dir "public/images/artworks" \
  --output-dir "docs/cafe24-mapping"
```

## 생성 파일

- `docs/cafe24-mapping/master-products.csv`
  - CSV 병합/중복 제거 결과 + 소스 파일/라인 + API 준비 상태
- `docs/cafe24-mapping/initial-mapping.csv`
  - 백필/동기화 작업의 기준 맵(`custom_product_code`, 작품 ID, 가격, 대표 이미지)
- `docs/cafe24-mapping/image-manifest.csv`
  - 이미지 컬럼별 참조 파일명과 실제 로컬 파일 해석 결과
  - 이미지 참조가 비어 있어도 `SAF2026-{id}` 기준으로 로컬 파일 자동 추론
- `docs/cafe24-mapping/missing-images.csv`
  - 업로드 불가능한(파일 누락) 항목만 추출
- `docs/cafe24-mapping/duplicate-codes.csv`
  - `자체 상품코드` 중복 진단
- `docs/cafe24-mapping/summary.json`
  - 전체 통계, 필수 컬럼 누락, 헤더 불일치 등 품질 리포트

## 다음 단계 권장

1. `missing-images.csv`를 먼저 정리해 `ready_for_api=Y` 비율을 100%로 맞춥니다.
2. Cafe24 API 연동 시 `custom_product_code`를 멱등 키로 사용합니다.
3. 상품 생성 후 응답의 `product_no`와 생성 URL(`surl`)을 내부 DB `shop_url`에 자동 반영합니다.
4. 신규 등록 플로우에서는 폼에서 `shop_url` 수동 입력을 제거하고, 백엔드 동기화 결과를 표시합니다.
