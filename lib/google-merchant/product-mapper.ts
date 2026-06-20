import type { Artwork } from '@/types';
import { parsePrice } from '@/lib/parsePrice';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';

export type MerchantCustomAttribute = {
  name: string;
  value: string;
};

export type MerchantProductInput = {
  offerId: string;
  contentLanguage: string;
  feedLabel: string;
  customAttributes: MerchantCustomAttribute[];
};

export type MerchantSyncCandidate = {
  artworkId: string;
  productInput: MerchantProductInput;
};

export type MerchantSkipReason =
  | 'hidden'
  | 'sold'
  | 'reserved'
  | 'missing_price'
  | 'missing_image'
  | 'missing_title';

export type MerchantSyncDecision = { sync: true } | { sync: false; reason: MerchantSkipReason };

const DEFAULT_CONTENT_LANGUAGE = 'ko';
const DEFAULT_FEED_LABEL = 'KR';
const DEFAULT_SITE_ORIGIN = 'https://www.saf2026.com';
// 브랜드 기본값 = 축제 브랜드 '씨앗페'. ('SAF2026'/'saf2026'은 도메인 문자열일 뿐 브랜드가 아님)
const DEFAULT_BRAND = '씨앗페';

function compactText(value: string | null | undefined): string {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 1).trimEnd();
}

function buildAttribute(name: string, value: string | null | undefined): MerchantCustomAttribute[] {
  const compacted = compactText(value);
  return compacted ? [{ name, value: compacted }] : [];
}

function buildDescription(artwork: Artwork): string {
  const parts = [
    artwork.description,
    [artwork.material, artwork.size, artwork.year].filter(Boolean).join(' · '),
    artwork.edition ? `에디션: ${artwork.edition}` : null,
  ];
  return truncate(compactText(parts.filter(Boolean).join('\n')), 5000);
}

function getPrimaryImage(artwork: Artwork): string {
  return resolveArtworkImageUrl(artwork.images?.[0] || '');
}

function formatMerchantPrice(priceText: string): string | null {
  const price = parsePrice(priceText);
  if (!Number.isFinite(price) || price <= 0) return null;
  return `${price} KRW`;
}

export function shouldSyncArtworkToMerchant(artwork: Artwork): MerchantSyncDecision {
  if (artwork.hidden) return { sync: false, reason: 'hidden' };
  if (artwork.sold) return { sync: false, reason: 'sold' };
  if (artwork.reserved) return { sync: false, reason: 'reserved' };
  if (!compactText(artwork.title)) return { sync: false, reason: 'missing_title' };
  if (!formatMerchantPrice(artwork.price)) return { sync: false, reason: 'missing_price' };
  if (!getPrimaryImage(artwork)) return { sync: false, reason: 'missing_image' };
  return { sync: true };
}

export function buildMerchantProductInput(
  artwork: Artwork,
  options: {
    siteOrigin?: string;
    contentLanguage?: string;
    feedLabel?: string;
    brand?: string;
  } = {}
): MerchantProductInput {
  const decision = shouldSyncArtworkToMerchant(artwork);
  if (!decision.sync) {
    throw new Error(`[google-merchant] artwork ${artwork.id} is not syncable: ${decision.reason}`);
  }

  const siteOrigin = (options.siteOrigin || DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const title = truncate(`${compactText(artwork.title)} - ${compactText(artwork.artist)}`, 150);
  const price = formatMerchantPrice(artwork.price);
  const primaryImage = getPrimaryImage(artwork);
  const additionalImages = (artwork.images || [])
    .slice(1, 11)
    .map((image) => resolveArtworkImageUrl(image))
    .filter(Boolean);

  const customAttributes: MerchantCustomAttribute[] = [
    ...buildAttribute('title', title),
    ...buildAttribute('description', buildDescription(artwork)),
    ...buildAttribute('link', `${siteOrigin}/artworks/${encodeURIComponent(artwork.id)}`),
    ...buildAttribute('image_link', primaryImage),
    ...additionalImages.flatMap((image) => buildAttribute('additional_image_link', image)),
    ...buildAttribute('price', price),
    ...buildAttribute('availability', 'in_stock'),
    ...buildAttribute('condition', 'new'),
    ...buildAttribute('brand', options.brand || DEFAULT_BRAND),
    ...buildAttribute('identifier_exists', 'no'),
    ...buildAttribute('custom_label_0', artwork.artist),
    ...buildAttribute('custom_label_1', artwork.category),
    ...buildAttribute('custom_label_2', artwork.edition),
    ...buildAttribute('material', artwork.material),
    ...buildAttribute('size', artwork.size),
  ];

  return {
    offerId: artwork.id,
    contentLanguage: options.contentLanguage || DEFAULT_CONTENT_LANGUAGE,
    feedLabel: options.feedLabel || DEFAULT_FEED_LABEL,
    customAttributes,
  };
}

export function getMerchantProductInputName(parent: string, offerId: string): string {
  const encoded = Buffer.from(`${DEFAULT_CONTENT_LANGUAGE}~${DEFAULT_FEED_LABEL}~${offerId}`)
    .toString('base64url')
    .replace(/=+$/, '');
  return `${parent.replace(/\/$/, '')}/productInputs/${encoded}`;
}

export function buildMerchantSyncCandidates(artworks: Artwork[]): {
  products: MerchantSyncCandidate[];
  skipped: Array<{ artworkId: string; reason: MerchantSkipReason }>;
} {
  const products: MerchantSyncCandidate[] = [];
  const skipped: Array<{ artworkId: string; reason: MerchantSkipReason }> = [];

  for (const artwork of artworks) {
    const decision = shouldSyncArtworkToMerchant(artwork);
    if (!decision.sync) {
      skipped.push({ artworkId: artwork.id, reason: decision.reason });
      continue;
    }
    products.push({ artworkId: artwork.id, productInput: buildMerchantProductInput(artwork) });
  }

  return { products, skipped };
}
