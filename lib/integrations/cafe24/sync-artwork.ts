import sharp from 'sharp';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { createCafe24AdminApiClient, getCafe24Config } from './client';

type JsonRecord = Record<string, unknown>;

type SyncArtworkRecord = {
  id: string;
  title: string;
  description: string | null;
  size: string | null;
  material: string | null;
  year: string | null;
  edition: string | null;
  edition_type: 'unique' | 'limited' | 'open' | string | null;
  edition_limit: number | null;
  price: string | null;
  images: string[] | null;
  status: 'available' | 'reserved' | 'sold' | string | null;
  is_hidden: boolean | null;
  shop_url: string | null;
  cafe24_product_no: number | null;
  cafe24_custom_product_code: string | null;
  artists: {
    name_ko: string | null;
    bio: string | null;
    history: string | null;
  } | null;
};

type SyncResult = {
  ok: boolean;
  shopUrl?: string;
  productNo?: number;
  reason?: string;
};

type InventorySyncPolicy = {
  mode: 'managed' | 'unmanaged';
  quantity: number | null;
  selling: boolean;
};

const SUPPORTED_CAFE24_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif']);
const DEFAULT_IMAGE_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_IMAGE_FETCH_RETRIES = 1;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveImageFetchTimeoutMs(): number {
  const raw = process.env.CAFE24_IMAGE_FETCH_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_IMAGE_FETCH_TIMEOUT_MS;
  return Math.max(3_000, parsed);
}

function resolveImageFetchRetries(): number {
  const raw = process.env.CAFE24_IMAGE_FETCH_RETRIES?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_IMAGE_FETCH_RETRIES;
  return Math.min(3, parsed);
}

function isRetryableImageStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parsePrice(priceRaw: string | null): { amount: number; inquiry: boolean } {
  if (!priceRaw) return { amount: 0, inquiry: true };
  if (priceRaw.includes('문의')) return { amount: 0, inquiry: true };
  const numeric = Number((priceRaw.match(/[\d,]+/)?.[0] || '0').replace(/,/g, ''));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { amount: 0, inquiry: true };
  }
  return { amount: Math.floor(numeric), inquiry: false };
}

function toPositiveInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeEditionType(
  value: SyncArtworkRecord['edition_type']
): 'unique' | 'limited' | 'open' {
  if (value === 'limited' || value === 'open') {
    return value;
  }
  return 'unique';
}

function buildInventorySyncPolicy(
  artwork: SyncArtworkRecord,
  soldQuantity: number
): InventorySyncPolicy {
  const isVisible = !artwork.is_hidden;
  const isAvailableStatus = artwork.status === 'available';
  const editionType = normalizeEditionType(artwork.edition_type);

  if (editionType === 'open') {
    return {
      mode: 'unmanaged',
      quantity: null,
      selling: isVisible && isAvailableStatus,
    };
  }

  const editionLimit = editionType === 'unique' ? 1 : toPositiveInteger(artwork.edition_limit);
  if (!editionLimit) {
    throw new Error('에디션 한정 수량이 올바르지 않습니다. edition_limit 값을 확인하세요.');
  }

  const safeSoldQuantity = Number.isFinite(soldQuantity)
    ? Math.max(0, Math.floor(soldQuantity))
    : 0;
  const remainingQuantity =
    artwork.status === 'sold' ? 0 : Math.max(editionLimit - safeSoldQuantity, 0);

  return {
    mode: 'managed',
    quantity: remainingQuantity,
    selling: isVisible && isAvailableStatus && remainingQuantity > 0,
  };
}

function normalizeForSummary(value: string | null): string {
  if (!value) return '';
  return stripHtml(value).trim();
}

function buildDescription(artwork: SyncArtworkRecord): string {
  const artistName = artwork.artists?.name_ko || '작가';
  const title = artwork.title || '';
  const material = normalizeForSummary(artwork.material);
  const size = normalizeForSummary(artwork.size);
  const year = normalizeForSummary(artwork.year);
  const edition = normalizeForSummary(artwork.edition);
  const description = normalizeForSummary(artwork.description);
  const profile = normalizeForSummary(artwork.artists?.bio || '');
  const history = normalizeForSummary(artwork.artists?.history || '');

  const metaParts = [material, size, year, edition].filter(Boolean).join(' | ');

  const sections: string[] = [];
  sections.push(
    '<div style="font-family: Noto Sans KR, sans-serif; line-height: 1.8; color: #222;">'
  );
  sections.push(`<h2 style="font-size: 22px; margin-bottom: 8px;">${escapeHtml(title)}</h2>`);
  sections.push(`<p style="margin: 0 0 12px; color: #555;">${escapeHtml(artistName)}</p>`);
  if (metaParts) {
    sections.push(`<p style="margin: 0 0 20px; color: #777;">${escapeHtml(metaParts)}</p>`);
  }
  if (description) {
    sections.push('<h3 style="font-size: 16px; margin: 18px 0 8px;">작품 설명</h3>');
    sections.push(`<p style="white-space: pre-line;">${escapeHtml(description)}</p>`);
  }
  if (profile) {
    sections.push('<h3 style="font-size: 16px; margin: 18px 0 8px;">작가 소개</h3>');
    sections.push(`<p style="white-space: pre-line;">${escapeHtml(profile)}</p>`);
  }
  if (history) {
    sections.push('<h3 style="font-size: 16px; margin: 18px 0 8px;">작가 이력</h3>');
    sections.push(`<p style="white-space: pre-line;">${escapeHtml(history)}</p>`);
  }
  sections.push('</div>');
  return sections.join('');
}

function buildCustomProductCode(artworkId: string): string {
  const normalized = artworkId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return `SAF2026-${normalized}`;
}

function buildProductUrl(mallId: string, productNo: number, categoryNo: number | null): string {
  if (mallId === 'koreasmartcoop') {
    return `https://${mallId}.cafe24.com/surl/O/${productNo}`;
  }

  const base = `https://${mallId}.cafe24.com/product/detail.html?product_no=${productNo}`;
  if (!categoryNo) return `${base}&display_group=1`;
  return `${base}&cate_no=${categoryNo}&display_group=1`;
}

function pickImageUrl(images: string[] | null): string | null {
  if (!Array.isArray(images)) return null;
  const first = images.find((url) => typeof url === 'string' && /^https?:\/\//.test(url));
  return first || null;
}

function mergeWarnings(current: string | null, next: string): string {
  return current ? `${current} | ${next}` : next;
}

function extractProductNo(value: unknown): number | null {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    const obj = current as JsonRecord;
    const productNo = obj.product_no;
    if (typeof productNo === 'number' && Number.isFinite(productNo)) {
      return Math.floor(productNo);
    }
    if (typeof productNo === 'string' && /^\d+$/.test(productNo)) {
      return Number(productNo);
    }
    for (const val of Object.values(obj)) {
      stack.push(val);
    }
  }
  return null;
}

function extractImagePath(value: unknown): string | null {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    const obj = current as JsonRecord;
    const path = obj.path;
    if (typeof path === 'string' && path.trim()) {
      return path.trim();
    }
    for (const val of Object.values(obj)) {
      stack.push(val);
    }
  }
  return null;
}

function extractCategoryNo(value: unknown): number | null {
  const stack: unknown[] = [value];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    if (Array.isArray(current)) {
      for (const child of current) stack.push(child);
      continue;
    }
    const obj = current as JsonRecord;
    const categoryNo = obj.category_no;
    if (typeof categoryNo === 'number' && Number.isFinite(categoryNo)) {
      return Math.floor(categoryNo);
    }
    if (typeof categoryNo === 'string' && /^\d+$/.test(categoryNo)) {
      return Number(categoryNo);
    }
    for (const val of Object.values(obj)) {
      stack.push(val);
    }
  }
  return null;
}

function normalizeCafe24ImagePath(path: string): string {
  const marker = '/web/upload/';
  if (path.startsWith(marker)) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    try {
      const pathname = new URL(path).pathname;
      const markerIndex = pathname.indexOf(marker);
      if (markerIndex >= 0) {
        return pathname.slice(markerIndex);
      }
    } catch {
      // ignore URL parse errors and fallback to string scan below
    }
  }

  const markerIndex = path.indexOf(marker);
  if (markerIndex >= 0) {
    return path.slice(markerIndex);
  }

  throw new Error(`Cafe24 이미지 경로 변환 실패: ${path}`);
}

function inferImageExtension(url: string, contentType: string | null): string | null {
  const fromUrl = url.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)?.[1]?.toLowerCase();
  if (fromUrl) return fromUrl;
  if (!contentType) return null;
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('gif')) return 'gif';
  if (contentType.includes('webp')) return 'webp';
  return null;
}

function compactObject<T extends JsonRecord>(value: T): T {
  const next: JsonRecord = {};
  for (const [key, val] of Object.entries(value)) {
    if (val === undefined || val === null) continue;
    if (typeof val === 'string' && !val.trim()) continue;
    if (Array.isArray(val) && val.length === 0) continue;
    next[key] = val;
  }
  return next as T;
}

function isMissingProductError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('does not exist') ||
    normalized.includes('not found') ||
    normalized.includes('invalid product') ||
    normalized.includes('invalid product_no') ||
    normalized.includes('존재하지')
  );
}

async function requestWithVariants(
  path: string,
  method: 'POST' | 'PUT',
  payload: JsonRecord,
  wrapperKeys: string[] = ['request', 'product']
): Promise<unknown> {
  const client = createCafe24AdminApiClient();
  const variants = Array.from(new Set([...wrapperKeys, 'plain'])).map((variant) => ({
    name: variant,
    body: variant === 'plain' ? payload : ({ [variant]: payload } as JsonRecord),
  }));
  const errors: string[] = [];

  for (const variant of variants) {
    try {
      return await client.request(path, {
        method,
        body: JSON.stringify(variant.body),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${variant.name}: ${message}`);
    }
  }

  throw new Error(`Cafe24 요청 실패: ${errors.join(' | ')}`);
}

function extractVariantCodes(value: unknown): string[] {
  const codes = new Set<string>();
  const stack: unknown[] = [value];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;

    if (Array.isArray(current)) {
      for (const child of current) {
        stack.push(child);
      }
      continue;
    }

    const obj = current as JsonRecord;
    const rawCode = obj.variant_code;
    if (typeof rawCode === 'string' && rawCode.trim()) {
      codes.add(rawCode.trim());
    }

    for (const child of Object.values(obj)) {
      stack.push(child);
    }
  }

  return Array.from(codes);
}

async function syncCafe24Inventory(productNo: number, policy: InventorySyncPolicy): Promise<void> {
  const client = createCafe24AdminApiClient();
  const variantResponse = await client.request(`/products/${productNo}/variants`, {
    method: 'GET',
  });
  const variantCodes = extractVariantCodes(variantResponse);

  if (variantCodes.length === 0) {
    throw new Error('카페24 상품 옵션(variant) 정보를 찾을 수 없습니다.');
  }

  if (variantCodes.length > 1) {
    throw new Error(
      `카페24 옵션 상품(${variantCodes.length}개 variant)은 자동 재고 동기화 대상이 아닙니다.`
    );
  }

  const [variantCode] = variantCodes;
  const payload =
    policy.mode === 'managed'
      ? compactObject({
          use_inventory: 'T',
          important_inventory: 'A',
          inventory_control_type: 'A',
          display_soldout: 'T',
          quantity: policy.quantity ?? 0,
        })
      : compactObject({
          use_inventory: 'F',
          display_soldout: 'F',
        });

  await requestWithVariants(
    `/products/${productNo}/variants/${encodeURIComponent(variantCode)}/inventories`,
    'PUT',
    payload,
    ['request', 'inventory', 'inventories', 'variant']
  );
}

async function fetchArtworkSoldQuantity(artworkId: string): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artwork_sales')
    .select('quantity')
    .eq('artwork_id', artworkId);

  if (error) {
    throw new Error(`판매 수량 조회 실패: ${error.message}`);
  }

  return (data || []).reduce((sum, row) => sum + (row.quantity || 0), 0);
}

async function upsertCafe24Product(
  artwork: SyncArtworkRecord,
  customProductCode: string,
  selling: boolean,
  priceAmount: number
): Promise<number> {
  const config = getCafe24Config();
  if (!config) {
    throw new Error('Cafe24 환경변수가 설정되지 않았습니다.');
  }

  const artistName = artwork.artists?.name_ko || '작가미상';
  const summary = [normalizeForSummary(artwork.material), normalizeForSummary(artwork.size)]
    .filter(Boolean)
    .join(' | ');
  const tagParts = [artistName, '씨앗페', 'SAF2026', '미술', '예술', '작품'];
  const isVisible = !artwork.is_hidden;

  const payload = compactObject({
    display: isVisible ? 'T' : 'F',
    selling: selling ? 'T' : 'F',
    custom_product_code: customProductCode,
    product_name: `${artwork.title} - ${artistName}`.trim(),
    supply_price: priceAmount,
    price: priceAmount,
    summary_description: summary,
    simple_description: summary,
    description: buildDescription(artwork),
    product_tag: tagParts,
    add_category_no: config.defaultCategoryNo
      ? [
          {
            category_no: config.defaultCategoryNo,
            recommend: 'T',
            new: 'T',
          },
        ]
      : undefined,
  });

  if (artwork.cafe24_product_no) {
    try {
      const response = await requestWithVariants(
        `/products/${artwork.cafe24_product_no}`,
        'PUT',
        payload
      );
      const resolved = extractProductNo(response);
      return resolved || artwork.cafe24_product_no;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isMissingProductError(message)) {
        throw error;
      }
    }
  }

  const response = await requestWithVariants('/products', 'POST', payload);
  const productNo = extractProductNo(response);
  if (!productNo) {
    throw new Error('Cafe24 상품 생성 응답에서 product_no를 찾을 수 없습니다.');
  }
  return productNo;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const timeoutMs = resolveImageFetchTimeoutMs();
  const maxRetries = resolveImageFetchRetries();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) {
        const message = `이미지 다운로드 실패(status=${response.status})`;
        if (attempt < maxRetries && isRetryableImageStatus(response.status)) {
          await wait(250 * 2 ** attempt);
          continue;
        }
        throw new Error(message);
      }

      const sourceBuffer = Buffer.from(await response.arrayBuffer());
      const extension = inferImageExtension(url, response.headers.get('content-type'));

      if (extension && SUPPORTED_CAFE24_IMAGE_EXTENSIONS.has(extension) && extension !== 'webp') {
        return sourceBuffer.toString('base64');
      }

      const convertedBuffer = await sharp(sourceBuffer).jpeg({ quality: 90 }).toBuffer();
      return convertedBuffer.toString('base64');
    } catch (error) {
      const timeoutError = error instanceof Error && error.name === 'AbortError';
      const message =
        error instanceof Error
          ? error.message
          : '이미지 다운로드 중 알 수 없는 오류가 발생했습니다.';
      const statusMatch = /status=(\d{3})/.exec(message);
      const statusCode = statusMatch ? Number.parseInt(statusMatch[1], 10) : null;
      const retryable = timeoutError || (statusCode !== null && isRetryableImageStatus(statusCode));
      lastError = new Error(timeoutError ? `이미지 다운로드 타임아웃(${timeoutMs}ms)` : message);
      if (attempt < maxRetries && retryable) {
        await wait(250 * 2 ** attempt);
        continue;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError || new Error('이미지 다운로드 실패');
}

async function ensureProductCategory(
  productNo: number,
  categoryNo: number | null
): Promise<number | null> {
  const client = createCafe24AdminApiClient();

  if (categoryNo) {
    try {
      await client.request(`/categories/${categoryNo}/products`, {
        method: 'POST',
        body: JSON.stringify({
          request: {
            product_no: [productNo],
            display_group: 1,
          },
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('same product in the category')) {
        throw new Error(`카테고리 연결 실패: ${message}`);
      }
    }
  }

  try {
    const productResponse = await client.request(`/products/${productNo}`, { method: 'GET' });
    return extractCategoryNo(productResponse) || categoryNo;
  } catch {
    return categoryNo;
  }
}

async function attachProductImage(productNo: number, imageUrl: string): Promise<void> {
  const client = createCafe24AdminApiClient();
  const imageBase64 = await fetchImageAsBase64(imageUrl);
  const uploadResponse = await client.request('/products/images', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        {
          image: imageBase64,
        },
      ],
    }),
  });
  const uploadedPath = extractImagePath(uploadResponse);
  if (!uploadedPath) {
    throw new Error('Cafe24 이미지 업로드 응답에서 path를 찾을 수 없습니다.');
  }
  const imagePath = normalizeCafe24ImagePath(uploadedPath);

  await client.request(`/products/${productNo}`, {
    method: 'PUT',
    body: JSON.stringify({
      request: {
        image_upload_type: 'A',
        detail_image: imagePath,
        list_image: imagePath,
        tiny_image: imagePath,
        small_image: imagePath,
      },
    }),
  });
}

async function markSyncState(
  artworkId: string,
  state: {
    cafe24_sync_status: string;
    cafe24_sync_error?: string | null;
    cafe24_product_no?: number | null;
    cafe24_custom_product_code?: string | null;
    shop_url?: string | null;
    cafe24_synced_at?: string | null;
  }
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const payload = {
    ...state,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('artworks').update(payload).eq('id', artworkId);
  if (error) {
    console.error('[cafe24-sync] 상태 저장 실패:', error.message);
  }
}

export async function syncArtworkToCafe24(artworkId: string): Promise<SyncResult> {
  const config = getCafe24Config();
  if (!config) {
    return { ok: false, reason: 'Cafe24 환경변수가 설정되지 않았습니다.' };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select(
      'id, title, description, size, material, year, edition, edition_type, edition_limit, price, images, status, is_hidden, shop_url, cafe24_product_no, cafe24_custom_product_code, artists(name_ko, bio, history)'
    )
    .eq('id', artworkId)
    .single();

  if (error || !data) {
    return { ok: false, reason: `작품 조회 실패: ${error?.message || 'not_found'}` };
  }

  const artwork = data as unknown as SyncArtworkRecord;
  const customCode = artwork.cafe24_custom_product_code || buildCustomProductCode(artwork.id);

  await markSyncState(artworkId, {
    cafe24_sync_status: 'syncing',
    cafe24_sync_error: null,
    cafe24_custom_product_code: customCode,
  });

  let latestProductNo: number | null = artwork.cafe24_product_no ?? null;

  try {
    const soldQuantity = await fetchArtworkSoldQuantity(artworkId);
    const inventoryPolicy = buildInventorySyncPolicy(artwork, soldQuantity);
    const priceInfo = parsePrice(artwork.price);
    const priceReadyToSell = !priceInfo.inquiry && priceInfo.amount > 0;
    const effectiveSelling = inventoryPolicy.selling && priceReadyToSell;
    let warningMessage: string | null = null;

    if (inventoryPolicy.selling && !priceReadyToSell) {
      warningMessage = mergeWarnings(
        warningMessage,
        '가격 미확정 상태(문의/미입력)라 카페24 판매를 비활성화했습니다.'
      );
    }

    const productNo = await upsertCafe24Product(
      artwork,
      customCode,
      effectiveSelling,
      priceInfo.amount
    );
    latestProductNo = productNo;
    const categoryNo = await ensureProductCategory(productNo, config.defaultCategoryNo);
    await syncCafe24Inventory(productNo, inventoryPolicy);
    const imageUrl = pickImageUrl(artwork.images);

    const mustHaveCategory = config.mallId === 'koreasmartcoop';
    if (!categoryNo && mustHaveCategory) {
      throw new Error(
        '상품 카테고리 연결에 실패했습니다. CAFE24_DEFAULT_CATEGORY_NO 및 카테고리 권한 설정을 확인하세요.'
      );
    }
    if (!categoryNo) {
      warningMessage = mergeWarnings(
        warningMessage,
        '상품 카테고리가 지정되지 않았습니다. CAFE24_DEFAULT_CATEGORY_NO 설정을 확인하세요.'
      );
    }

    if (imageUrl) {
      try {
        await attachProductImage(productNo, imageUrl);
      } catch (error) {
        warningMessage = mergeWarnings(
          warningMessage,
          error instanceof Error ? error.message : String(error)
        );
      }
    } else {
      warningMessage = mergeWarnings(
        warningMessage,
        '대표 이미지가 없어 카페24 이미지 업로드를 건너뛰었습니다.'
      );
    }

    const shopUrl = buildProductUrl(config.mallId, productNo, categoryNo);
    await markSyncState(artworkId, {
      cafe24_sync_status: warningMessage ? 'synced_with_warning' : 'synced',
      cafe24_sync_error: warningMessage,
      cafe24_product_no: productNo,
      cafe24_custom_product_code: customCode,
      shop_url: shopUrl,
      cafe24_synced_at: new Date().toISOString(),
    });

    return { ok: true, shopUrl, productNo, reason: warningMessage || undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const pendingAuth = message.includes('OAuth 연결');
    const fallbackProductNo = latestProductNo;
    const fallbackShopUrl =
      fallbackProductNo && artwork.cafe24_product_no === fallbackProductNo
        ? artwork.shop_url
        : null;
    await markSyncState(artworkId, {
      cafe24_sync_status: pendingAuth ? 'pending_auth' : 'failed',
      cafe24_sync_error: message,
      cafe24_product_no: fallbackProductNo,
      cafe24_custom_product_code: customCode,
      shop_url: fallbackShopUrl,
    });
    return { ok: false, reason: message };
  }
}

export async function triggerCafe24ArtworkSync(artworkId: string): Promise<void> {
  try {
    const result = await syncArtworkToCafe24(artworkId);
    if (!result.ok) {
      console.error(`[cafe24-sync] artwork=${artworkId} failed: ${result.reason}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cafe24-sync] artwork=${artworkId} crashed: ${message}`);
  }
}
