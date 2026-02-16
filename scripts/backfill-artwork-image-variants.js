#!/usr/bin/env node

const path = require('path');
const dotenv = require('dotenv');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const VARIANTS = [
  { variant: 'thumb', maxSize: 400, quality: 72 },
  { variant: 'card', maxSize: 960, quality: 75 },
  { variant: 'detail', maxSize: 1600, quality: 80 },
  { variant: 'hero', maxSize: 1920, quality: 80 },
  { variant: 'original', maxSize: 2560, quality: 82 },
];

const PAGE_SIZE = 200;
const ARTWORK_BUCKET = 'artworks';
const STORAGE_MARKERS = [
  '/storage/v1/object/public/artworks/',
  '/storage/v1/render/image/public/artworks/',
];
const VARIANT_SUFFIX_REGEX = /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;
const TRAILING_VARIANT_TOKEN_REGEX = /__(thumb|card|detail|hero|original)$/i;
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    limit: null,
    artworkId: null,
    checkMissing: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--check-missing') {
      options.checkMissing = true;
      continue;
    }
    if (arg === '--limit') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--limit 값이 필요합니다.');
      }
      options.limit = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--artwork-id') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('--artwork-id 값이 필요합니다.');
      }
      options.artworkId = next;
      i += 1;
      continue;
    }
    throw new Error(`알 수 없는 옵션: ${arg}`);
  }

  if (options.limit !== null && (!Number.isFinite(options.limit) || options.limit <= 0)) {
    throw new Error('--limit은 1 이상의 숫자여야 합니다.');
  }

  return options;
};

const resolveStoragePathFromPublicUrl = (url) => {
  if (typeof url !== 'string' || !url) return null;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  for (const marker of STORAGE_MARKERS) {
    const idx = parsed.pathname.indexOf(marker);
    if (idx !== -1) {
      return parsed.pathname.slice(idx + marker.length);
    }
  }

  return null;
};

const toPublicUrl = (pathInBucket) => {
  const {
    data: { publicUrl },
  } = supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(pathInBucket);
  return publicUrl;
};

const normalizeVariantBasePath = (storagePath) => {
  const withoutExt = FILE_EXTENSION_REGEX.test(storagePath)
    ? storagePath.replace(FILE_EXTENSION_REGEX, '')
    : storagePath;
  let base = withoutExt;
  while (TRAILING_VARIANT_TOKEN_REGEX.test(base)) {
    base = base.replace(TRAILING_VARIANT_TOKEN_REGEX, '');
  }
  return base;
};

const toCanonicalOriginalVariantPath = (storagePath) => {
  const base = normalizeVariantBasePath(storagePath);
  return `${base}__original.webp`;
};

const buildVariantPath = (storagePath, variant) => {
  const base = normalizeVariantBasePath(storagePath);
  return `${base}__${variant}.webp`;
};

const isAlreadyVariantPath = (storagePath) => VARIANT_SUFFIX_REGEX.test(storagePath.split('/').pop() || '');

const checkAllVariantsExist = async (storagePath) => {
  const basePath = normalizeVariantBasePath(storagePath);
  const missingVariants = [];

  for (const spec of VARIANTS) {
    const variantPath = `${basePath}__${spec.variant}.webp`;
    const { data, error } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .createSignedUrl(variantPath, 1); // 1 second - just checking existence

    if (error || !data) {
      missingVariants.push(spec.variant);
    }
  }

  return { allExist: missingVariants.length === 0, missingVariants };
};

async function fetchArtworks({ limit, artworkId }) {
  if (artworkId) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, title, artist_id, images')
      .eq('id', artworkId)
      .limit(1);
    if (error) throw error;
    return data || [];
  }

  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('artworks')
      .select('id, title, artist_id, images')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (limit !== null && rows.length >= limit) {
      return rows.slice(0, limit);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function generateVariantBuffers(sourceBuffer) {
  const source = sharp(sourceBuffer, { failOnError: false }).rotate();
  const result = {};

  for (const spec of VARIANTS) {
    const buffer = await source
      .clone()
      .resize({
        width: spec.maxSize,
        height: spec.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: spec.quality })
      .toBuffer();
    result[spec.variant] = buffer;
  }

  return result;
}

async function convertOneImage(storagePath, options) {
  const originalVariantPath = toCanonicalOriginalVariantPath(storagePath);

  // If it already has a variant suffix
  if (isAlreadyVariantPath(storagePath)) {
    // Check if all variants exist when --check-missing is enabled
    if (options.checkMissing) {
      const { allExist, missingVariants } = await checkAllVariantsExist(storagePath);
      if (allExist) {
        return { canonicalPath: originalVariantPath, converted: false, skipped: true };
      }
      console.log(`  [!] Missing variants for ${storagePath}: ${missingVariants.join(', ')}`);
      // Continue to regenerate all variants
    } else {
      return { canonicalPath: originalVariantPath, converted: false, skipped: true };
    }
  }

  if (!options.apply) {
    return { canonicalPath: originalVariantPath, converted: true, skipped: false };
  }

  const { data: sourceData, error: downloadError } = await supabase.storage
    .from(ARTWORK_BUCKET)
    .download(storagePath);

  if (downloadError || !sourceData) {
    throw new Error(`download 실패 (${storagePath}): ${downloadError?.message || 'unknown'}`);
  }

  const arrayBuffer = await sourceData.arrayBuffer();
  const sourceBuffer = Buffer.from(arrayBuffer);
  const variants = await generateVariantBuffers(sourceBuffer);

  for (const spec of VARIANTS) {
    const variantPath = buildVariantPath(storagePath, spec.variant);
    const { error: uploadError } = await supabase.storage.from(ARTWORK_BUCKET).upload(
      variantPath,
      variants[spec.variant],
      {
        upsert: true,
        contentType: 'image/webp',
      }
    );

    if (uploadError) {
      throw new Error(`upload 실패 (${variantPath}): ${uploadError.message}`);
    }
  }

  return { canonicalPath: originalVariantPath, converted: true, skipped: false };
}

async function main() {
  const options = parseArgs();
  const artworks = await fetchArtworks(options);

  let processedArtworks = 0;
  let updatedArtworks = 0;
  let processedImages = 0;
  let convertedImages = 0;
  let skippedImages = 0;
  let failedImages = 0;

  const failedItems = [];

  for (const artwork of artworks) {
    processedArtworks += 1;
    const images = Array.isArray(artwork.images) ? artwork.images : [];
    let changed = false;
    const nextImages = [];

    for (const imageUrl of images) {
      processedImages += 1;
      const storagePath = resolveStoragePathFromPublicUrl(imageUrl);

      if (!storagePath) {
        skippedImages += 1;
        nextImages.push(imageUrl);
        continue;
      }

      try {
        const result = await convertOneImage(storagePath, options);
        const nextUrl = toPublicUrl(result.canonicalPath);
        nextImages.push(nextUrl);

        if (imageUrl !== nextUrl) {
          changed = true;
        }

        if (result.converted) {
          convertedImages += 1;
        } else if (result.skipped) {
          skippedImages += 1;
        }
      } catch (error) {
        failedImages += 1;
        failedItems.push({
          artworkId: artwork.id,
          imageUrl,
          message: error.message || String(error),
        });
        nextImages.push(imageUrl);
      }
    }

    if (changed && options.apply) {
      const { error: updateError } = await supabase
        .from('artworks')
        .update({ images: nextImages, updated_at: new Date().toISOString() })
        .eq('id', artwork.id);

      if (updateError) {
        failedItems.push({
          artworkId: artwork.id,
          imageUrl: '(artwork row update)',
          message: updateError.message,
        });
      } else {
        updatedArtworks += 1;
      }
    } else if (changed) {
      updatedArtworks += 1;
    }

    if (processedArtworks % 25 === 0 || processedArtworks === artworks.length) {
      console.log(
        `[progress] artworks=${processedArtworks}/${artworks.length} images=${processedImages} converted=${convertedImages} failed=${failedImages}`
      );
    }
  }

  console.log('--- summary ---');
  console.log(`mode=${options.apply ? 'apply' : 'dry-run'}${options.checkMissing ? ' (check-missing)' : ''}`);
  console.log(`artworks_total=${artworks.length}`);
  console.log(`artworks_updated=${updatedArtworks}`);
  console.log(`images_processed=${processedImages}`);
  console.log(`images_converted=${convertedImages}`);
  console.log(`images_skipped=${skippedImages}`);
  console.log(`images_failed=${failedImages}`);

  if (failedItems.length > 0) {
    console.log('--- failed-items (max 20) ---');
    failedItems.slice(0, 20).forEach((item, index) => {
      console.log(
        `${index + 1}. artwork=${item.artworkId} image=${item.imageUrl} error=${item.message}`
      );
    });
  }

  if (failedImages > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('백필 실행 실패:', error.message || error);
  process.exit(1);
});
