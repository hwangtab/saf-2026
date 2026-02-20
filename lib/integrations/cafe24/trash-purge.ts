import { createCafe24AdminApiClient, getCafe24Config } from './client';

type JsonRecord = Record<string, unknown>;

export type Cafe24ProductPurgeResult = {
  deleted: number;
  missing: number;
  failed: number;
  skipped: boolean;
  productNos: number[];
  errors: string[];
};

function asObject(value: unknown): JsonRecord | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as JsonRecord;
}

function asObjectList(value: unknown): JsonRecord[] | null {
  if (Array.isArray(value)) {
    return value.filter((item): item is JsonRecord => !!item && typeof item === 'object');
  }

  const objectValue = asObject(value);
  if (!objectValue) return null;
  const items = objectValue.items;
  if (!Array.isArray(items)) return null;
  return items.filter((item): item is JsonRecord => !!item && typeof item === 'object');
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function extractProductNoFromShopUrl(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();

  try {
    const parsed = new URL(raw);
    const fromQuery = parsed.searchParams.get('product_no');
    if (fromQuery && /^\d+$/.test(fromQuery)) {
      return Number(fromQuery);
    }
  } catch {
    // Fallback regex below
  }

  const match = raw.match(/[?&]product_no=(\d+)/i);
  if (match?.[1]) {
    return Number(match[1]);
  }

  const surlMatch = raw.match(/\/surl\/[A-Za-z]\/(\d+)(?:[/?#]|$)/);
  if (surlMatch?.[1]) {
    return Number(surlMatch[1]);
  }

  return null;
}

function collectArtworkSnapshots(beforeSnapshot: unknown): JsonRecord[] {
  const list = asObjectList(beforeSnapshot);
  if (list && list.length > 0) return list;

  const single = asObject(beforeSnapshot);
  if (!single) return [];
  return [single];
}

export function extractCafe24ProductNosFromBeforeSnapshot(beforeSnapshot: unknown): number[] {
  const snapshots = collectArtworkSnapshots(beforeSnapshot);
  const productNos = new Set<number>();

  for (const snapshot of snapshots) {
    const directNo = toNumber(snapshot.cafe24_product_no);
    if (directNo) {
      productNos.add(directNo);
      continue;
    }

    const fromUrl = extractProductNoFromShopUrl(snapshot.shop_url);
    if (fromUrl) {
      productNos.add(fromUrl);
    }
  }

  return Array.from(productNos).sort((a, b) => a - b);
}

function isMissingProductError(message: string): boolean {
  return message.includes('Products to delete does not exist.');
}

export async function purgeCafe24ProductsFromTrashEntry(input: {
  targetType: string;
  beforeSnapshot: unknown;
}): Promise<Cafe24ProductPurgeResult> {
  const emptyResult: Cafe24ProductPurgeResult = {
    deleted: 0,
    missing: 0,
    failed: 0,
    skipped: false,
    productNos: [],
    errors: [],
  };

  if (input.targetType !== 'artwork') {
    return emptyResult;
  }

  const productNos = extractCafe24ProductNosFromBeforeSnapshot(input.beforeSnapshot);
  if (productNos.length === 0) {
    return { ...emptyResult, productNos };
  }

  // Cafe24 설정이 없는 환경에서는 휴지통 정리 자체는 계속 진행하도록 스킵 처리한다.
  if (!getCafe24Config()) {
    return { ...emptyResult, productNos, skipped: true };
  }

  const client = createCafe24AdminApiClient();
  const result: Cafe24ProductPurgeResult = {
    ...emptyResult,
    productNos,
  };

  for (const productNo of productNos) {
    try {
      await client.request(`/products/${productNo}`, { method: 'DELETE' });
      result.deleted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isMissingProductError(message)) {
        result.missing += 1;
      } else {
        result.failed += 1;
        result.errors.push(`product_no=${productNo}: ${message}`);
      }
    }
  }

  return result;
}
