#!/usr/bin/env node

require('tsconfig-paths/register');

const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const dotenv = require('dotenv');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');
const { createJiti } = require('jiti');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const jiti = createJiti(__filename);

const ARTWORK_BUCKET = 'artworks';
const PAGE_SIZE = 200;
const AUDIT_CONCURRENCY = 10;
const REMOTE_FETCH_TIMEOUT_MS = 30_000;
const VARIANTS = [
  { variant: 'thumb', maxSize: 400, quality: 72 },
  { variant: 'card', maxSize: 960, quality: 75 },
  { variant: 'detail', maxSize: 1600, quality: 80 },
  { variant: 'hero', maxSize: 1920, quality: 80 },
  { variant: 'original', maxSize: 2560, quality: 82 },
];
const STORAGE_MARKERS = [
  `/storage/v1/object/public/${ARTWORK_BUCKET}/`,
  `/storage/v1/render/image/public/${ARTWORK_BUCKET}/`,
];
const ARTWORK_VARIANT_SUFFIX_REGEX =
  /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;
const TRAILING_VARIANT_TOKEN_REGEX = /__(thumb|card|detail|hero|original)$/i;
const FILE_EXTENSION_REGEX = /\.[^/.]+$/;
const DEFAULT_REPORT_DIR = path.join(process.cwd(), 'backups', 'artwork-image-backups');
const DEFAULT_TEMP_ROOT = path.join(os.tmpdir(), 'saf-artwork-upscale');
const DEFAULT_MODEL_URL =
  'https://raw.githubusercontent.com/Saafke/FSRCNN_Tensorflow/master/models/FSRCNN_x4.pb';

const nowStamp = () => {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(
    date.getHours()
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    apply: false,
    threshold: 800,
    minLongEdge: 1600,
    maxLongEdge: 1920,
    limit: null,
    artworkId: null,
    includeHidden: false,
    secondPassCutoff: 900,
    forceDoublePassBelow: 225,
    reportDir: DEFAULT_REPORT_DIR,
    tempRoot: DEFAULT_TEMP_ROOT,
    modelUrl: DEFAULT_MODEL_URL,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const next = args[i + 1];

    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--include-hidden') {
      options.includeHidden = true;
      continue;
    }
    if (arg === '--threshold') {
      options.threshold = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--min-long-edge') {
      options.minLongEdge = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--max-long-edge') {
      options.maxLongEdge = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--limit') {
      options.limit = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--artwork-id') {
      options.artworkId = next;
      i += 1;
      continue;
    }
    if (arg === '--second-pass-cutoff') {
      options.secondPassCutoff = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--force-double-pass-below') {
      options.forceDoublePassBelow = Number(next);
      i += 1;
      continue;
    }
    if (arg === '--report-dir') {
      options.reportDir = path.resolve(next);
      i += 1;
      continue;
    }
    if (arg === '--temp-root') {
      options.tempRoot = path.resolve(next);
      i += 1;
      continue;
    }
    throw new Error(`알 수 없는 옵션: ${arg}`);
  }

  if (!Number.isFinite(options.threshold) || options.threshold <= 0) {
    throw new Error('--threshold는 1 이상의 숫자여야 합니다.');
  }
  if (!Number.isFinite(options.minLongEdge) || options.minLongEdge <= 0) {
    throw new Error('--min-long-edge는 1 이상의 숫자여야 합니다.');
  }
  if (!Number.isFinite(options.maxLongEdge) || options.maxLongEdge < options.minLongEdge) {
    throw new Error('--max-long-edge는 --min-long-edge 이상이어야 합니다.');
  }
  if (options.limit !== null && (!Number.isFinite(options.limit) || options.limit <= 0)) {
    throw new Error('--limit은 1 이상의 숫자여야 합니다.');
  }

  return options;
};

const isRemoteUrl = (value) =>
  typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'));

const resolveStoragePathFromPublicUrl = (url) => {
  if (typeof url !== 'string' || url.length === 0) return null;

  try {
    const parsed = new URL(url);
    for (const marker of STORAGE_MARKERS) {
      const index = parsed.pathname.indexOf(marker);
      if (index !== -1) {
        return parsed.pathname.slice(index + marker.length);
      }
    }
    return null;
  } catch {
    return null;
  }
};

const normalizeVariantBasePath = (storagePath) => {
  let base = FILE_EXTENSION_REGEX.test(storagePath)
    ? storagePath.replace(FILE_EXTENSION_REGEX, '')
    : storagePath;

  while (TRAILING_VARIANT_TOKEN_REGEX.test(base)) {
    base = base.replace(TRAILING_VARIANT_TOKEN_REGEX, '');
  }

  return base;
};

const buildVariantPath = (storagePath, variant) => {
  const base = normalizeVariantBasePath(storagePath);
  return `${base}__${variant}.webp`;
};

const expandStaleVariantPaths = (storagePath) => {
  if (!ARTWORK_VARIANT_SUFFIX_REGEX.test(storagePath)) {
    return [storagePath];
  }

  const paths = new Set([storagePath]);
  const rawBase = storagePath.replace(FILE_EXTENSION_REGEX, '');

  for (const variant of ['thumb', 'card', 'detail', 'hero', 'original']) {
    paths.add(`${rawBase}__${variant}.webp`);
  }

  return Array.from(paths);
};

const toPublicUrl = (storagePath) => {
  const {
    data: { publicUrl },
  } = supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(storagePath);
  return publicUrl;
};

const ensureDir = async (dirPath) => {
  await fsp.mkdir(dirPath, { recursive: true });
};

const safeSegment = (value) =>
  String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'artwork';

const downloadRemoteBuffer = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'saf-artwork-upscale/1.0' },
    });

    if (!response.ok) {
      throw new Error(`remote_fetch_failed:${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
};

const resolveLegacyLocalPath = (rawValue) => {
  const candidates = [
    path.join(process.cwd(), 'out', 'images', 'artworks', rawValue),
    path.join(process.cwd(), 'public', 'images', 'artworks', rawValue),
    path.join(process.cwd(), 'public', rawValue),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
};

const readSourceBuffer = async (imageUrl) => {
  if (!imageUrl) {
    throw new Error('missing_image_url');
  }

  if (isRemoteUrl(imageUrl)) {
    return {
      buffer: await downloadRemoteBuffer(imageUrl),
      sourceKind: 'remote',
      storagePath: resolveStoragePathFromPublicUrl(imageUrl),
    };
  }

  const localPath = resolveLegacyLocalPath(imageUrl);
  if (!localPath) {
    throw new Error(`missing_local_file:${imageUrl}`);
  }

  return {
    buffer: await fsp.readFile(localPath),
    sourceKind: 'local',
    storagePath: null,
  };
};

async function fetchAllArtworks(options) {
  const rows = [];

  if (options.artworkId) {
    let query = supabase
      .from('artworks')
      .select('id, title, images, is_hidden, artists(name_ko)')
      .eq('id', options.artworkId)
      .limit(1);

    if (!options.includeHidden) {
      query = query.eq('is_hidden', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  let from = 0;

  while (true) {
    let query = supabase
      .from('artworks')
      .select('id, title, images, is_hidden, artists(name_ko)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (!options.includeHidden) {
      query = query.eq('is_hidden', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (options.limit !== null && rows.length >= options.limit) {
      return rows.slice(0, options.limit);
    }
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function runWithConcurrency(items, concurrency, iteratee) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await iteratee(items[index], index);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function inspectArtwork(row, options, workDirs) {
  const artistName = row.artists?.name_ko || 'Unknown Artist';
  const imageUrl =
    Array.isArray(row.images) && typeof row.images[0] === 'string' ? row.images[0].trim() : '';

  try {
    const source = await readSourceBuffer(imageUrl);
    const metadata = await sharp(source.buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const longEdge = Math.max(width, height);
    const target = longEdge > 0 && longEdge < options.threshold;

    const record = {
      id: row.id,
      title: row.title || '',
      artist: artistName,
      images: Array.isArray(row.images) ? row.images : [],
      imageUrl,
      sourceKind: source.sourceKind,
      sourceStoragePath: source.storagePath,
      width,
      height,
      longEdge,
      format: metadata.format || null,
      bytes: source.buffer.length,
      target,
      inputPath: null,
      outputPath: null,
    };

    if (options.apply && target) {
      const ext = safeSegment(metadata.format || path.extname(imageUrl).replace('.', '') || 'img');
      const inputPath = path.join(workDirs.inputs, `${safeSegment(row.id)}.${ext}`);
      const outputPath = path.join(workDirs.outputs, `${safeSegment(row.id)}.png`);
      await fsp.writeFile(inputPath, source.buffer);
      record.inputPath = inputPath;
      record.outputPath = outputPath;
    }

    return record;
  } catch (error) {
    return {
      id: row.id,
      title: row.title || '',
      artist: artistName,
      images: Array.isArray(row.images) ? row.images : [],
      imageUrl,
      target: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const summarizeTargets = (records, threshold) => {
  const ok = records.filter((record) => !record.error);
  const targets = ok.filter((record) => record.target);
  const failures = records.filter((record) => record.error);

  return {
    total: records.length,
    inspected: ok.length,
    failed: failures.length,
    threshold,
    targets: targets.length,
    failures,
    targetsPreview: targets
      .slice()
      .sort((a, b) => a.longEdge - b.longEdge)
      .slice(0, 40)
      .map((record) => ({
        id: record.id,
        artist: record.artist,
        title: record.title,
        width: record.width,
        height: record.height,
        longEdge: record.longEdge,
        sourceKind: record.sourceKind,
      })),
  };
};

async function ensureModelFile(modelUrl, tempRoot) {
  const modelDir = path.join(tempRoot, 'models');
  await ensureDir(modelDir);

  const modelPath = path.join(modelDir, path.basename(new URL(modelUrl).pathname));
  if (fs.existsSync(modelPath)) {
    return modelPath;
  }

  const response = await fetch(modelUrl, {
    headers: { 'user-agent': 'saf-artwork-upscale/1.0' },
  });
  if (!response.ok) {
    throw new Error(`모델 다운로드 실패: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fsp.writeFile(modelPath, buffer);
  return modelPath;
}

function runBackupScript() {
  const result = spawnSync('node', ['scripts/backup-artwork-images.js'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'artwork image backup failed');
  }

  return result.stdout.trim().split('\n').filter(Boolean);
}

function runPythonUpscaler(manifestPath, modelPath, options) {
  const helperPath = path.join(process.cwd(), 'scripts', 'upscale_artwork_images.py');
  const result = spawnSync(
    'uv',
    [
      'run',
      '--with',
      'opencv-contrib-python-headless',
      '--with',
      'pillow',
      'python',
      helperPath,
      '--manifest',
      manifestPath,
      '--model',
      modelPath,
      '--model-name',
      'fsrcnn',
      '--scale',
      '4',
      '--second-pass-cutoff',
      String(options.secondPassCutoff),
      '--force-double-pass-below',
      String(options.forceDoublePassBelow),
    ],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 20,
    }
  );

  if (!result.stdout) {
    throw new Error(result.stderr || 'upscale helper returned empty stdout');
  }

  const payload = JSON.parse(result.stdout);
  if (result.status !== 0) {
    throw new Error(result.stderr || JSON.stringify(payload));
  }

  return payload;
}

async function buildVariantBuffers(sourceBuffer, options) {
  const sourceMeta = await sharp(sourceBuffer).metadata();
  const currentLongEdge = Math.max(sourceMeta.width || 0, sourceMeta.height || 0);

  let pipeline = sharp(sourceBuffer).rotate();
  if (currentLongEdge > options.maxLongEdge) {
    pipeline = pipeline.resize({
      width: options.maxLongEdge,
      height: options.maxLongEdge,
      fit: 'inside',
      withoutEnlargement: false,
    });
  } else if (currentLongEdge < options.minLongEdge) {
    pipeline = pipeline.resize({
      width: options.minLongEdge,
      height: options.minLongEdge,
      fit: 'inside',
      withoutEnlargement: false,
    });
  }

  const originalBuffer = await pipeline.webp({ quality: 82 }).toBuffer();
  const originalMeta = await sharp(originalBuffer).metadata();
  const variantBuffers = { original: originalBuffer };

  for (const spec of VARIANTS) {
    if (spec.variant === 'original') continue;
    variantBuffers[spec.variant] = await sharp(originalBuffer)
      .resize({
        width: spec.maxSize,
        height: spec.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: spec.quality })
      .toBuffer();
  }

  return {
    variantBuffers,
    originalMeta: {
      width: originalMeta.width || 0,
      height: originalMeta.height || 0,
      longEdge: Math.max(originalMeta.width || 0, originalMeta.height || 0),
      bytes: originalBuffer.length,
    },
  };
}

const getTargetOriginalPath = (record) => {
  if (record.sourceStoragePath) {
    return buildVariantPath(record.sourceStoragePath, 'original');
  }

  const baseName = safeSegment(path.parse(record.imageUrl || record.id).name || record.id);
  return `legacy-artwork-${safeSegment(record.id)}/${baseName}__original.webp`;
};

async function applyOneTarget(record, pythonResultById, options) {
  const pythonResult = pythonResultById.get(record.id);
  if (!pythonResult) {
    throw new Error('python_upscale_result_missing');
  }

  const upscaledBuffer = await fsp.readFile(record.outputPath);
  const { variantBuffers, originalMeta } = await buildVariantBuffers(upscaledBuffer, options);

  const originalStoragePath = getTargetOriginalPath(record);
  const uploadedPaths = [];

  try {
    for (const spec of VARIANTS) {
      const storagePath =
        spec.variant === 'original'
          ? originalStoragePath
          : buildVariantPath(originalStoragePath, spec.variant);
      const buffer = variantBuffers[spec.variant];

      const { error: uploadError } = await supabase.storage.from(ARTWORK_BUCKET).upload(
        storagePath,
        buffer,
        {
          upsert: true,
          contentType: 'image/webp',
        }
      );

      if (uploadError) {
        throw new Error(`upload_failed:${storagePath}:${uploadError.message}`);
      }

      uploadedPaths.push(storagePath);
    }

    const publicUrl = toPublicUrl(originalStoragePath);
    const nextImages = [...record.images];
    if (nextImages.length === 0) {
      nextImages.push(publicUrl);
    } else {
      nextImages[0] = publicUrl;
    }

    const { error: updateError } = await supabase
      .from('artworks')
      .update({
        images: nextImages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', record.id);

    if (updateError) {
      throw new Error(`db_update_failed:${updateError.message}`);
    }

    const oldExactStoragePath =
      record.sourceStoragePath && record.sourceStoragePath !== originalStoragePath
        ? record.sourceStoragePath
        : null;

    if (oldExactStoragePath) {
      const stalePaths = expandStaleVariantPaths(oldExactStoragePath);
      const { error: removeError } = await supabase.storage
        .from(ARTWORK_BUCKET)
        .remove(stalePaths);
      if (removeError) {
        console.error(
          `[upscale-artwork-images] old source cleanup failed: ${oldExactStoragePath}: ${removeError.message}`
        );
      }
    }

    return {
      id: record.id,
      artist: record.artist,
      title: record.title,
      before: {
        imageUrl: record.imageUrl,
        width: record.width,
        height: record.height,
        longEdge: record.longEdge,
        sourceKind: record.sourceKind,
      },
      ai: {
        passes: pythonResult.passes,
        firstPassWidth: pythonResult.first_pass_width,
        firstPassHeight: pythonResult.first_pass_height,
        outputWidth: pythonResult.output_width,
        outputHeight: pythonResult.output_height,
        seconds: pythonResult.seconds,
      },
      after: {
        imageUrl: publicUrl,
        storagePath: originalStoragePath,
        width: originalMeta.width,
        height: originalMeta.height,
        longEdge: originalMeta.longEdge,
        bytes: originalMeta.bytes,
      },
    };
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from(ARTWORK_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

async function main() {
  const options = parseArgs();
  const stamp = nowStamp();
  const workDir = path.join(options.tempRoot, stamp);
  const workDirs = {
    root: workDir,
    inputs: path.join(workDir, 'inputs'),
    outputs: path.join(workDir, 'outputs'),
  };

  await ensureDir(options.reportDir);
  await ensureDir(workDirs.inputs);
  await ensureDir(workDirs.outputs);

  const rows = await fetchAllArtworks(options);
  const records = await runWithConcurrency(rows, AUDIT_CONCURRENCY, (row) =>
    inspectArtwork(row, options, workDirs)
  );

  const summary = summarizeTargets(records, options.threshold);
  const report = {
    createdAt: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'dry-run',
    options,
    summary,
    applied: [],
    applyFailures: [],
    backup: null,
  };

  const reportPath = path.join(options.reportDir, `artwork-upscale-report-${stamp}.json`);

  if (!options.apply) {
    await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`report=${reportPath}`);
    console.log(`targets=${summary.targets}`);
    console.log(`threshold=${options.threshold}`);
    return;
  }

  if (summary.targets === 0) {
    await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`report=${reportPath}`);
    console.log('targets=0');
    return;
  }

  report.backup = runBackupScript();

  const targets = records
    .filter((record) => record.target && !record.error)
    .slice(0, options.limit ?? undefined);

  const manifestPath = path.join(workDir, 'manifest.json');
  await fsp.writeFile(
    manifestPath,
    `${JSON.stringify(
      targets.map((record) => ({
        id: record.id,
        input_path: record.inputPath,
        output_path: record.outputPath,
      })),
      null,
      2
    )}\n`,
    'utf8'
  );

  const modelPath = await ensureModelFile(options.modelUrl, options.tempRoot);
  const pythonPayload = runPythonUpscaler(manifestPath, modelPath, options);
  const pythonResultById = new Map(
    (pythonPayload.results || []).map((result) => [String(result.id), result])
  );

  for (const record of targets) {
    try {
      const applied = await applyOneTarget(record, pythonResultById, options);
      report.applied.push(applied);
      console.log(`applied=${record.id} ${record.artist} / ${record.title}`);
    } catch (error) {
      report.applyFailures.push({
        id: record.id,
        artist: record.artist,
        title: record.title,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(
        `[upscale-artwork-images] failed=${record.id} ${record.artist} / ${record.title}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  if (pythonPayload.failures && pythonPayload.failures.length > 0) {
    report.applyFailures.push(...pythonPayload.failures);
  }

  await fsp.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`report=${reportPath}`);
  console.log(`applied=${report.applied.length}`);
  console.log(`failed=${report.applyFailures.length}`);
}

main().catch((error) => {
  console.error('[upscale-artwork-images] fatal:', error);
  process.exit(1);
});
