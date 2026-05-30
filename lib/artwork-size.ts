/**
 * 작품 크기 도메인 로직 — 단일 출처.
 * cm 기반 파싱 + 호수(號) 근사 환산 + 구간 분류 + 표시 정보.
 *
 * 주의: lib/utils/parseArtworkSize.ts는 3D 가상 갤러리 전용(미터 단위, 실패 시 기본값).
 * 관심사가 달라 통합하지 않는다. 이 모듈은 cm·표시·분류 전담.
 */

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

// 표준 호수표(F형 기준) 면적(cm²). cm→호 역환산용 최근접 매칭 기준.
const HO_TABLE: ReadonlyArray<{ ho: number; area: number }> = [
  { ho: 1, area: 359 },
  { ho: 2, area: 462 },
  { ho: 3, area: 601 },
  { ho: 4, area: 808 },
  { ho: 5, area: 950 },
  { ho: 6, area: 1301 },
  { ho: 8, area: 1724 },
  { ho: 10, area: 2412 },
  { ho: 12, area: 3030 },
  { ho: 15, area: 3450 },
  { ho: 20, area: 4406 },
  { ho: 25, area: 5236 },
  { ho: 30, area: 6608 },
  { ho: 40, area: 8030 },
  { ho: 50, area: 10629 },
  { ho: 60, area: 12639 },
  { ho: 80, area: 16311 },
  { ho: 100, area: 21135 },
  { ho: 120, area: 25265 },
  { ho: 150, area: 41323 },
  { ho: 200, area: 50239 },
  { ho: 300, area: 63474 },
  { ho: 500, area: 82825 },
];

// 종횡비 이 이상이면 호수 표기 부적합 → confident=false.
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
  const a = area(d);
  if (!(a > 0)) return null;
  let best = HO_TABLE[0];
  for (const row of HO_TABLE) {
    if (Math.abs(row.area - a) < Math.abs(best.area - a)) best = row;
  }
  const ratio = Math.max(d.width, d.height) / Math.min(d.width, d.height);
  return { ho: best.ho, confident: ratio <= HO_RATIO_MAX };
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
