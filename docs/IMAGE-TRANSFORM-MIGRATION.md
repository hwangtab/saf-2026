# Supabase Image Transform 마이그레이션 계획

## 개요

이 문서는 SAF 2026 프로젝트의 이미지 시스템을 **사전 생성 variant 방식**에서 **Supabase Image Transform (온디맨드 리사이징)** 방식으로 전환하는 마이그레이션 계획을 설명합니다.

---

## 1. 배경 및 문제점

### 1.1 현재 시스템 구조

작가가 작품 이미지를 업로드하면 클라이언트에서 **5개의 WebP variant**를 생성하여 Supabase Storage에 저장합니다:

| Variant    | 최대 크기 | 품질 | 용도                     |
| ---------- | --------- | ---- | ------------------------ |
| `thumb`    | 400px     | 72%  | 슬라이더, 작은 썸네일    |
| `card`     | 960px     | 75%  | 갤러리 카드              |
| `detail`   | 1600px    | 80%  | 상세 페이지              |
| `hero`     | 1920px    | 80%  | 히어로 섹션              |
| `original` | 2560px    | 82%  | 최대 해상도 (라이트박스) |

**저장 경로 예시:**

```
artworks/{artistId}/{randomId}__thumb.webp
artworks/{artistId}/{randomId}__card.webp
artworks/{artistId}/{randomId}__detail.webp
artworks/{artistId}/{randomId}__hero.webp
artworks/{artistId}/{randomId}__original.webp
```

**DB 저장:** `images` 배열에 `__original.webp` URL만 저장하고, 표시 시 variant suffix를 교체하여 적절한 크기의 이미지 요청.

### 1.2 문제점

#### 1.2.1 업로드 실패 확률 증가

- 5개 파일을 순차적으로 업로드해야 하므로 실패 확률이 5배
- 네트워크 불안정, 브라우저 크래시, 메모리 부족 등으로 **부분 업로드** 발생
- 실제 사례: 김태균 작가의 "Ornament #3-1", "Ornament #3" 작품이 `original`만 업로드되고 나머지 variant 누락 → 갤러리에서 엑박 표시

#### 1.2.2 복잡한 에러 핸들링

- 어느 variant에서 실패했는지 추적 필요
- 실패 시 업로드된 파일 롤백 로직 복잡
- Silent failure로 인해 문제 발견이 늦어짐

#### 1.2.3 Storage 비용

- 이미지당 5개 파일 저장 → Storage 사용량 5배
- `hero`(1920px)와 `detail`(1600px)의 차이가 미미하여 중복 낭비

#### 1.2.4 클라이언트 부담

- 브라우저에서 5개 이미지 변환 수행 → 대용량 이미지 시 메모리 부족
- 업로드 시간 증가 (변환 + 5회 업로드)

---

## 2. 해결책: Supabase Image Transform

### 2.1 Image Transform이란?

Supabase의 [Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) 기능으로, **원본 이미지 1개만 저장**하고 요청 시 **URL 파라미터로 리사이징**합니다.

```
# 원본
/storage/v1/object/public/artworks/{path}/image.webp

# 400px로 리사이징
/storage/v1/render/image/public/artworks/{path}/image.webp?width=400&quality=75
```

### 2.2 장점

| 항목           | 현재 (variant) | 신규 (transform) | 개선      |
| -------------- | -------------- | ---------------- | --------- |
| 업로드 파일 수 | 5개            | 1개              | 80% 감소  |
| 실패 확률      | 높음           | 낮음             | 80% 감소  |
| Storage 사용량 | 5배            | 1배              | 80% 절감  |
| 업로드 시간    | 느림           | 빠름             | ~70% 단축 |
| 코드 복잡도    | 높음           | 낮음             | 단순화    |

### 2.3 CDN 캐싱

- 변환된 이미지는 Cloudflare CDN에 캐싱됨
- `cache-control: max-age=3600` (1시간)
- 동일 크기 요청은 캐시에서 즉시 응답

### 2.4 검증 결과

```bash
# 테스트 이미지: 김태균 작가 Ornament #3-1 (원본 599KB)

width=400:  179KB (70% 감소)
width=960:  392KB (35% 감소)
width=1600: 582KB (3% 감소)
width=1920: 661KB (원본보다 큼 - 업스케일)
```

---

## 3. 마이그레이션 계획

### 3.1 Phase 1: 표시 로직 변경 (하위 호환)

기존 `__original.webp` URL을 그대로 사용하되, 표시 시 Image Transform URL로 변환합니다.

**변경 파일:**

#### `lib/utils.ts`

```typescript
// 신규 함수 추가
export function resolveArtworkTransformUrl(
  image: string,
  options: { width?: number; height?: number; quality?: number }
): string {
  const resolved = resolveArtworkImageUrl(image);

  // Supabase Storage URL인 경우만 transform 적용
  if (!resolved.includes('/storage/v1/object/public/artworks/')) {
    return resolved;
  }

  // object/public → render/image/public 변환
  const transformUrl = resolved.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );

  const params = new URLSearchParams();
  if (options.width) params.set('width', String(options.width));
  if (options.height) params.set('height', String(options.height));
  if (options.quality) params.set('quality', String(options.quality));

  return `${transformUrl}?${params.toString()}`;
}

// 프리셋 매핑
export const ARTWORK_TRANSFORM_PRESETS = {
  slider: { width: 400, quality: 75 },
  card: { width: 960, quality: 75 },
  detail: { width: 1600, quality: 80 },
  hero: { width: 1920, quality: 80 },
  original: {}, // transform 없이 원본 사용
} as const;
```

#### `components/common/SafeImage.tsx`

```typescript
// srcSet 생성을 Image Transform으로 변경
const srcSet = [400, 960, 1600, 1920]
  .map((w) => `${resolveArtworkTransformUrl(src, { width: w, quality: 75 })} ${w}w`)
  .join(', ');
```

### 3.2 Phase 2: 업로드 로직 단순화

**변경 파일:**

#### `lib/client/image-optimization.ts`

```typescript
// 기존 generateArtworkImageVariants() 제거하고 단일 파일 최적화로 변경
export async function optimizeArtworkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 업로드할 수 있습니다.');
  }

  const img = await loadImage(file);
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  // 원본만 2560px, WebP로 최적화
  return await renderToWebpFile(img, `${baseName}.webp`, 2560, 0.82);
}
```

#### `components/dashboard/ImageUpload.tsx`

```typescript
// 5개 variant 업로드 → 1개만 업로드
if (bucket === 'artworks') {
  setUploadProgress('이미지 최적화 중...');
  const optimizedFile = await optimizeArtworkImage(file);

  const fileName = `${randomId}_${Date.now()}.webp`;
  const filePath = `${pathPrefix}/${fileName}`;

  setUploadProgress('업로드 중...');
  const uploadResult = await uploadWithRetry(filePath, optimizedFile);

  if (!uploadResult.success) {
    throw uploadResult.error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(filePath);

  newUrls.push(publicUrl);
}
```

### 3.3 Phase 3: 기존 Variant 파일 정리

기존에 저장된 `__thumb.webp`, `__card.webp`, `__detail.webp`, `__hero.webp` 파일을 삭제하여 Storage 비용을 절감합니다.

#### 정리 스크립트: `scripts/cleanup-artwork-variants.js`

```javascript
#!/usr/bin/env node
/**
 * 기존 artwork variant 파일 정리 스크립트
 *
 * __original.webp 외의 variant 파일(__thumb, __card, __detail, __hero)을 삭제합니다.
 * Image Transform 마이그레이션 후 실행하세요.
 *
 * Usage:
 *   npm run cleanup:artwork-variants:dry    # 삭제 대상 확인 (실제 삭제 안함)
 *   npm run cleanup:artwork-variants:apply  # 실제 삭제 실행
 */

const VARIANT_SUFFIXES_TO_DELETE = ['__thumb.webp', '__card.webp', '__detail.webp', '__hero.webp'];
const KEEP_SUFFIX = '__original.webp';

async function listFilesToDelete(supabase) {
  const { data: files, error } = await supabase.storage
    .from('artworks')
    .list('', { limit: 10000, sortBy: { column: 'name', order: 'asc' } });

  if (error) throw error;

  // 재귀적으로 모든 파일 수집
  const allFiles = [];
  for (const item of files) {
    if (item.id) {
      // 파일인 경우
      const shouldDelete = VARIANT_SUFFIXES_TO_DELETE.some((suffix) => item.name.endsWith(suffix));
      if (shouldDelete) {
        allFiles.push(item.name);
      }
    } else {
      // 폴더인 경우 - 하위 파일 검색
      const subFiles = await listFilesInFolder(supabase, item.name);
      allFiles.push(...subFiles);
    }
  }

  return allFiles;
}

async function main() {
  const isDryRun = !process.argv.includes('--apply');

  console.log(`Mode: ${isDryRun ? 'DRY RUN (삭제 안함)' : 'APPLY (실제 삭제)'}`);

  const filesToDelete = await listFilesToDelete(supabase);

  console.log(`삭제 대상 파일: ${filesToDelete.length}개`);

  if (isDryRun) {
    filesToDelete.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
    if (filesToDelete.length > 20) {
      console.log(`  ... 외 ${filesToDelete.length - 20}개`);
    }
    console.log('\n실제 삭제하려면: npm run cleanup:artwork-variants:apply');
    return;
  }

  // 배치로 삭제 (Supabase 제한: 1000개씩)
  const BATCH_SIZE = 1000;
  for (let i = 0; i < filesToDelete.length; i += BATCH_SIZE) {
    const batch = filesToDelete.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.storage.from('artworks').remove(batch);
    if (error) {
      console.error(`Batch ${i / BATCH_SIZE + 1} 삭제 실패:`, error);
    } else {
      console.log(`Batch ${i / BATCH_SIZE + 1}: ${batch.length}개 삭제 완료`);
    }
  }

  console.log(`\n총 ${filesToDelete.length}개 파일 삭제 완료`);
}
```

#### package.json에 스크립트 추가

```json
{
  "scripts": {
    "cleanup:artwork-variants:dry": "node scripts/cleanup-artwork-variants.js",
    "cleanup:artwork-variants:apply": "node scripts/cleanup-artwork-variants.js --apply"
  }
}
```

---

## 4. 구현 순서

| 단계 | 작업                                                 | 위험도 | 롤백 가능 |
| ---- | ---------------------------------------------------- | ------ | --------- |
| 1    | `lib/utils.ts`에 `resolveArtworkTransformUrl()` 추가 | 낮음   | O         |
| 2    | `SafeImage.tsx`가 Transform URL 사용하도록 수정      | 중간   | O         |
| 3    | 배포 후 모니터링 (기존 데이터 호환 확인)             | -      | -         |
| 4    | `ImageUpload.tsx` 단순화 (원본 1개만 업로드)         | 낮음   | O         |
| 5    | `image-optimization.ts`에서 variant 생성 제거        | 낮음   | O         |
| 6    | 기존 variant 파일 정리 스크립트 실행                 | 높음   | X         |

**주의:** 단계 6(파일 정리)은 되돌릴 수 없으므로, 단계 1-5가 완전히 검증된 후에만 실행합니다.

---

## 5. 하위 호환성

### 5.1 기존 데이터

- DB에 저장된 `__original.webp` URL은 그대로 유효
- Image Transform이 `__original.webp` 파일을 소스로 사용
- 기존 URL 형식 변경 불필요

### 5.2 Fallback

- Image Transform 실패 시 원본 URL로 fallback
- CDN 캐시 미스 시에도 원본에서 즉시 변환

---

## 6. 검증 방법

### 6.1 개발 환경

```bash
# 1. 개발 서버 실행
npm run dev

# 2. 갤러리 페이지 접속
open http://localhost:3000/artworks

# 3. Network 탭에서 이미지 URL 확인
# - /render/image/public/...?width=960 형식이어야 함

# 4. 신규 업로드 테스트
# - 대시보드에서 작품 업로드
# - Supabase Storage에 파일 1개만 생성되는지 확인
```

### 6.2 Lighthouse 성능 비교

```bash
# 마이그레이션 전
lighthouse https://saf2026.com/artworks --output json > before.json

# 마이그레이션 후
lighthouse https://saf2026.com/artworks --output json > after.json

# LCP, Speed Index 비교
```

---

## 7. 예상 효과

| 지표              | 현재  | 예상 | 개선 |
| ----------------- | ----- | ---- | ---- |
| 업로드 성공률     | ~80%  | ~99% | +19% |
| 업로드 시간       | ~15초 | ~5초 | -67% |
| Storage 사용량    | 100%  | 20%  | -80% |
| 코드 복잡도 (LOC) | ~200  | ~50  | -75% |

---

## 8. 참고 자료

- [Supabase Image Transformations 문서](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase Storage CDN 캐싱](https://supabase.com/docs/guides/storage/cdn/fundamentals)
- [WebP 이미지 포맷](https://developers.google.com/speed/webp)
