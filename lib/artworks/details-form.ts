import {
  parseUrlList,
  validateArtworkData,
  validateImageUrls,
} from '@/lib/actions/artwork-validation';
import {
  buildArtworkSizeFields,
  getString,
  type ArtworkSizeFields,
} from '@/lib/utils/form-helpers';
import type { Database } from '@/types/supabase';

type EditionType = Database['public']['Enums']['edition_type'];

export const ADMIN_ARTWORK_MAX_IMAGES = 10;

export type AdminArtworkDetailsFormValues = ArtworkSizeFields & {
  title: string;
  title_en: string | null;
  admin_product_name: string | null;
  description: string;
  material: string;
  year: string;
  edition: string;
  edition_type: EditionType;
  edition_limit: number | null;
  price: string;
  tax_type: string;
  category: string | null;
  artist_id: string;
  tone: string[];
  quote: string | null;
  quote_en: string | null;
};

export type AdminArtworkCreateFormValues = AdminArtworkDetailsFormValues & {
  images: string[];
  imageOwnerPrefix: string;
};

export function parseAdminArtworkDetailsFormData(
  formData: FormData
): AdminArtworkDetailsFormValues {
  const dataValidation = validateArtworkData(formData);
  if (dataValidation.error) throw new Error(dataValidation.error);

  const rawEditionType = getString(formData, 'edition_type') || 'unique';
  const edition_type = (
    ['unique', 'limited', 'open'].includes(rawEditionType) ? rawEditionType : 'unique'
  ) as EditionType;
  const edition_limit_raw = getString(formData, 'edition_limit');

  return {
    title: getString(formData, 'title'),
    title_en: getString(formData, 'title_en') || null,
    admin_product_name: getString(formData, 'admin_product_name') || null,
    description: getString(formData, 'description'),
    ...buildArtworkSizeFields(formData),
    material: getString(formData, 'material'),
    year: getString(formData, 'year'),
    edition: getString(formData, 'edition'),
    edition_type,
    edition_limit:
      edition_type === 'limited' && edition_limit_raw ? Number(edition_limit_raw) : null,
    price: getString(formData, 'price'),
    tax_type: getString(formData, 'tax_type') || 'B',
    category: getString(formData, 'category') || null,
    artist_id: getString(formData, 'artist_id'),
    tone: formData
      .getAll('tone')
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean),
    quote: getString(formData, 'quote') || null,
    quote_en: getString(formData, 'quote_en') || null,
  };
}

export function parseAdminArtworkCreateFormData(formData: FormData): AdminArtworkCreateFormValues {
  const details = parseAdminArtworkDetailsFormData(formData);
  const imageOwnerPrefix = getString(formData, 'image_owner_prefix');
  const imageList = parseUrlList(formData.get('images'), '이미지');

  if (imageList.error) throw new Error(imageList.error);
  if (imageList.urls.length > ADMIN_ARTWORK_MAX_IMAGES) {
    throw new Error(`이미지는 최대 ${ADMIN_ARTWORK_MAX_IMAGES}장까지 등록할 수 있습니다.`);
  }
  if (imageList.urls.length > 0) {
    if (!imageOwnerPrefix.startsWith('admin-artwork-draft-')) {
      throw new Error('이미지 업로드 경로가 올바르지 않습니다.');
    }
    const imageValidation = validateImageUrls(imageList.urls, imageOwnerPrefix);
    if (imageValidation.error) throw new Error(imageValidation.error);
  }

  if (!details.artist_id) throw new Error('작가를 선택해 주세요.');

  return {
    ...details,
    images: imageList.urls,
    imageOwnerPrefix,
  };
}

export function buildAdminArtworkDetailsUpdate(values: AdminArtworkDetailsFormValues, now: string) {
  return {
    title: values.title,
    title_en: values.title_en,
    admin_product_name: values.admin_product_name,
    description: values.description,
    size: values.size,
    width_cm: values.width_cm,
    height_cm: values.height_cm,
    depth_cm: values.depth_cm,
    size_bucket: values.size_bucket,
    material: values.material,
    year: values.year,
    edition: values.edition,
    edition_type: values.edition_type,
    edition_limit: values.edition_limit,
    price: values.price,
    tax_type: values.tax_type,
    category: values.category,
    tone: values.tone.length ? values.tone : null,
    quote: values.quote,
    quote_en: values.quote_en,
    artist_id: values.artist_id || undefined,
    updated_at: now,
  };
}

export function buildAdminArtworkCreateInsert(values: AdminArtworkCreateFormValues) {
  return {
    title: values.title,
    title_en: values.title_en,
    admin_product_name: values.admin_product_name,
    description: values.description,
    size: values.size,
    width_cm: values.width_cm,
    height_cm: values.height_cm,
    depth_cm: values.depth_cm,
    size_bucket: values.size_bucket,
    material: values.material,
    year: values.year,
    edition: values.edition,
    edition_type: values.edition_type,
    edition_limit: values.edition_limit,
    price: values.price,
    tax_type: values.tax_type,
    category: values.category,
    tone: values.tone.length ? values.tone : null,
    quote: values.quote,
    quote_en: values.quote_en,
    shop_url: null,
    artist_id: values.artist_id,
    status: 'available' as const,
    is_hidden: false,
    images: values.images,
  };
}
