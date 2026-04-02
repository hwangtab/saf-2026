/**
 * Parse artwork size string into real-world dimensions in meters.
 * Handles: "60x45cm", "60.6×40.9cm", "60x60x130cm", "30호", "11x40inch", "확인 중", ""
 * 3D world: 1 unit = 1 meter
 */

const HO_SIZES: Record<number, [number, number]> = {
  0: [18.0, 14.0],
  1: [22.7, 16.0],
  2: [24.2, 19.0],
  3: [27.3, 22.0],
  4: [33.3, 24.2],
  5: [35.0, 27.3],
  6: [40.9, 31.8],
  8: [45.5, 37.9],
  10: [53.0, 40.9],
  12: [60.6, 50.0],
  15: [65.1, 53.0],
  20: [72.7, 60.6],
  25: [80.3, 65.1],
  30: [90.9, 72.7],
  40: [100.0, 80.3],
  50: [116.7, 91.0],
  60: [130.3, 97.0],
  80: [145.5, 112.1],
  100: [162.1, 130.3],
  120: [193.9, 130.3],
};

export interface ArtworkDimensions {
  widthM: number;
  heightM: number;
  depthM?: number;
  isDefault?: boolean;
}

const DEFAULT_DIMENSIONS: ArtworkDimensions = { widthM: 0.5, heightM: 0.6, isDefault: true };

export function parseArtworkSize(size: string): ArtworkDimensions {
  if (!size || size === '확인 중') return DEFAULT_DIMENSIONS;

  const trimmed = size.trim();

  // WxH(xD)cm — e.g. "53x53cm", "60.6x40.9cm", "60x60x130cm"
  const cmMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)(?:\s*[×xX]\s*(\d+(?:\.\d+)?))?\s*cm/i
  );
  if (cmMatch) {
    const result: ArtworkDimensions = {
      widthM: parseFloat(cmMatch[1]) / 100,
      heightM: parseFloat(cmMatch[2]) / 100,
    };
    if (cmMatch[3]) result.depthM = parseFloat(cmMatch[3]) / 100;
    return result;
  }

  // WxH(xD)mm — e.g. "12x12x285mm"
  const mmMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)(?:\s*[×xX]\s*(\d+(?:\.\d+)?))?\s*mm/i
  );
  if (mmMatch) {
    const result: ArtworkDimensions = {
      widthM: parseFloat(mmMatch[1]) / 1000,
      heightM: parseFloat(mmMatch[2]) / 1000,
    };
    if (mmMatch[3]) result.depthM = parseFloat(mmMatch[3]) / 1000;
    return result;
  }

  // WxH inch — e.g. "11x40inch"
  const inchMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)\s*inch/i);
  if (inchMatch) {
    return {
      widthM: parseFloat(inchMatch[1]) * 0.0254,
      heightM: parseFloat(inchMatch[2]) * 0.0254,
    };
  }

  // Korean ho (호) — e.g. "30호", "8호"
  const hoMatch = trimmed.match(/^(\d+)\s*호/);
  if (hoMatch) {
    const ho = parseInt(hoMatch[1], 10);
    const dims = HO_SIZES[ho];
    if (dims) {
      return { widthM: dims[0] / 100, heightM: dims[1] / 100 };
    }
  }

  return DEFAULT_DIMENSIONS;
}
