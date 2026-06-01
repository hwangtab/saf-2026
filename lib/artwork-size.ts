/**
 * 작품 크기 도메인 로직 — 단일 출처.
 * cm 기반 파싱 + 호수(號) 근사 환산 + 구간 분류 + 표시 정보.
 *
 * 주의: lib/utils/parseArtworkSize.ts는 3D 가상 갤러리 전용(미터 단위, 실패 시 기본값).
 * 관심사가 달라 통합하지 않는다. 이 모듈은 cm·표시·분류 전담.
 *
 * 단, 가상 갤러리("벽에 걸어보기")용 toRoomDimensions만 parseArtworkSize의 미터 변환·
 * 기본값 로직을 폴백으로 재사용한다(구조화 cm 우선, 평문은 폴백).
 */

import { parseArtworkSize, type ArtworkDimensions } from '@/lib/utils/parseArtworkSize';

export interface Dimensions {
  width: number;
  height: number;
  depth: number | null;
}

export type SizeBucket = 'small' | 'medium' | 'large' | 'xlarge' | 'object';

export interface SizeInfo {
  cm: string;
  ho: number | null;
  bucket: SizeBucket | null;
  is3d: boolean;
}

// 표준 호수표(F형 기준) 긴 변(cm). cm→호 환산은 긴 변 기준 최근접 매칭.
// 호수는 긴 변으로 결정되며 F·P·M형은 긴 변이 동일하므로, 긴 변으로 매칭하면 형(型)에
// 무관하게 정확하다(면적은 F>P>M로 달라 부정확). 정사각(S형)은 estimateHo 비율 가드로 제외.
const HO_TABLE: ReadonlyArray<{ ho: number; longEdge: number }> = [
  { ho: 0, longEdge: 18.0 },
  { ho: 1, longEdge: 22.7 },
  { ho: 2, longEdge: 25.8 },
  { ho: 3, longEdge: 27.3 },
  { ho: 4, longEdge: 33.4 },
  { ho: 5, longEdge: 34.8 },
  { ho: 6, longEdge: 40.9 },
  { ho: 8, longEdge: 45.5 },
  { ho: 10, longEdge: 53.0 },
  { ho: 12, longEdge: 60.6 },
  { ho: 15, longEdge: 65.1 },
  { ho: 20, longEdge: 72.7 },
  { ho: 25, longEdge: 80.3 },
  { ho: 30, longEdge: 90.9 },
  { ho: 40, longEdge: 100.0 },
  { ho: 50, longEdge: 116.8 },
  { ho: 60, longEdge: 130.3 },
  { ho: 80, longEdge: 145.5 },
  { ho: 100, longEdge: 162.2 },
  { ho: 120, longEdge: 193.9 },
  { ho: 150, longEdge: 227.3 },
  { ho: 200, longEdge: 259.1 },
  { ho: 300, longEdge: 290.9 },
  { ho: 500, longEdge: 333.3 },
];

// 종횡비 가드 — 이 이상 길쭉하면(M형보다) 호수 표기 부적합 → confident=false.
// 정사각(S형)도 긴 변으로 호수 표기: S형의 한 변 = 같은 호수 F형의 긴 변(무사시노미대 표준
// 정의: "S size width/height = long side of the corresponding F number")이므로, 긴 변을
// F형 표에 매칭하면 S형 규격표를 직접 쓰는 것과 수학적으로 동일하다(근사 아님). 별도 S 표 없이
// 정사각이 정확히 S호수로 환산됨(예: 45.5×45.5 → S8 = 8호, 53×53 → S10 = 10호).
const HO_RATIO_MAX = 2.2;

// 구간 경계(면적 cm²) — 호수 사이 중간값으로 라벨("~10호"/"10–30호"/"30–100호"/"100호~")과 정합.
// small/medium = 10호(2412)~12호(3030) 중간, medium/large = 30호(6608)~40호(8030) 중간,
// large/xlarge = 100호(21135)~120호(25265) 중간. 백필 SQL과 동일 유지. spec §4.4.
const BUCKET_SMALL_MAX = 2721; // ~10호
const BUCKET_MEDIUM_MAX = 7319; // 10–30호
const BUCKET_LARGE_MAX = 23200; // 30–100호

const SIZE_RE = /^(\d+(?:\.\d+)?)\s*[x×X]\s*(\d+(?:\.\d+)?)(?:\s*[x×X]\s*(\d+(?:\.\d+)?))?\s*cm$/;

export function parseSizeText(raw: string | null | undefined): Dimensions | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = s.match(SIZE_RE);
  if (!m) return null;
  const width = parseFloat(m[1]);
  const height = parseFloat(m[2]);
  const depth = m[3] !== undefined ? parseFloat(m[3]) : null;
  if (!(width > 0) || !(height > 0)) return null;
  if (depth !== null && !(depth > 0)) return null;
  return { width, height, depth };
}

export function area(d: Pick<Dimensions, 'width' | 'height'>): number {
  return d.width * d.height;
}

export function estimateHo(
  d: Pick<Dimensions, 'width' | 'height'>
): { ho: number; confident: boolean } | null {
  const long = Math.max(d.width, d.height);
  const short = Math.min(d.width, d.height);
  if (!(long > 0) || !(short > 0)) return null;
  // 긴 변 기준 최근접 — F·P·M 긴 변이 동일하므로 형에 무관하게 호수가 정확.
  let best = HO_TABLE[0];
  for (const row of HO_TABLE) {
    if (Math.abs(row.longEdge - long) < Math.abs(best.longEdge - long)) best = row;
  }
  // 극단 비율(M형보다 길쭉, >2.2)만 호수 표기 생략. 정사각(S형)은 긴 변으로 근사 호수 표기.
  const ratio = long / short;
  const confident = ratio <= HO_RATIO_MAX;
  return { ho: best.ho, confident };
}

export function classifyBucket(d: Dimensions): SizeBucket {
  if (d.depth != null) return 'object';
  const a = area(d);
  if (a <= BUCKET_SMALL_MAX) return 'small';
  if (a <= BUCKET_MEDIUM_MAX) return 'medium';
  if (a <= BUCKET_LARGE_MAX) return 'large';
  return 'xlarge';
}

// 60.0 → "60", 72.70 → "72.7"
function fmt(n: number): string {
  return String(Number(n.toFixed(1)));
}

export function describeSize(input: {
  size?: string | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
}): SizeInfo | null {
  let dims: Dimensions | null = null;
  if (input.width_cm != null && input.height_cm != null) {
    dims = { width: input.width_cm, height: input.height_cm, depth: input.depth_cm ?? null };
  } else {
    dims = parseSizeText(input.size);
  }
  if (!dims) return null;

  const is3d = dims.depth != null;
  const cm = is3d
    ? `${fmt(dims.width)}×${fmt(dims.height)}×${fmt(dims.depth as number)}cm`
    : `${fmt(dims.width)}×${fmt(dims.height)}cm`;
  const hoEst = is3d ? null : estimateHo(dims);
  const ho = hoEst && hoEst.confident ? hoEst.ho : null;
  const bucket = classifyBucket(dims);
  return { cm, ho, bucket, is3d };
}

/**
 * 가상 갤러리("벽에 걸어보기")용 미터 단위 치수.
 * 구조화 컬럼(cm) 우선 — 정확·일관. 컬럼이 없으면 size 텍스트 파싱(parseArtworkSize) 폴백.
 * 반환 타입은 3D 월드 컴포넌트가 쓰는 ArtworkDimensions(미터).
 */
export function toRoomDimensions(input: {
  size?: string | null;
  width_cm?: number | null;
  height_cm?: number | null;
  depth_cm?: number | null;
}): ArtworkDimensions {
  if (input.width_cm != null && input.height_cm != null) {
    return {
      widthM: input.width_cm / 100,
      heightM: input.height_cm / 100,
      depthM: input.depth_cm != null ? input.depth_cm / 100 : undefined,
    };
  }
  return parseArtworkSize(input.size || '');
}
