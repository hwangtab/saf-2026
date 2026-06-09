#!/usr/bin/env node

const fs = require('node:fs');
const Module = require('node:module');
const path = require('node:path');

function registerPathAlias() {
  if (Module.__safMerchantAliasRegistered) return;
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      return originalResolveFilename.call(
        this,
        path.join(process.cwd(), request.slice(2)),
        parent,
        isMain,
        options
      );
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
  Module.__safMerchantAliasRegistered = true;
}

function getTsLoader() {
  const { createJiti } = require('jiti');
  return createJiti(__filename, {
    interopDefault: true,
    moduleCache: true,
  });
}

function loadDotenv() {
  for (const file of ['.env.local', '.env.production.local', '.env']) {
    if (fs.existsSync(file)) require('dotenv').config({ path: file });
  }
}

function parseArgs(argv) {
  const options = {
    dryRun: true,
    limit: null,
    onlyId: null,
    deleteId: null,
    outDir: 'reports',
    deleteMissing: false,
    refreshAll: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--apply') {
      options.dryRun = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--limit' && next) {
      options.limit = Number(next);
      i += 1;
    } else if (arg === '--only-id' && next) {
      options.onlyId = next;
      i += 1;
    } else if (arg === '--delete-id' && next) {
      options.deleteId = next;
      i += 1;
    } else if (arg === '--out-dir' && next) {
      options.outDir = next;
      i += 1;
    } else if (arg === '--delete-missing') {
      options.deleteMissing = true;
    } else if (arg === '--no-refresh-all') {
      options.refreshAll = false;
    }
  }

  return options;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

async function createSyncPlan({ products, skipped = [], options, insertProduct }) {
  let candidates = products;
  if (options.onlyId) candidates = candidates.filter((item) => item.artworkId === options.onlyId);
  if (Number.isFinite(options.limit) && options.limit !== null) {
    candidates = candidates.slice(0, options.limit);
  }

  const items = [];
  let insertedCount = 0;
  let failedCount = 0;

  for (const item of candidates) {
    if (options.dryRun) {
      items.push({ ...item, status: 'planned' });
      continue;
    }
    try {
      const response = await insertProduct(item.productInput);
      insertedCount += 1;
      items.push({ ...item, status: 'inserted', response });
    } catch (error) {
      failedCount += 1;
      items.push({
        ...item,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    summary: {
      mode: options.dryRun ? 'dry-run' : 'apply',
      plannedInsertCount: candidates.length,
      insertedCount,
      failedCount,
      skippedCount: skipped.length,
      generatedAt: new Date().toISOString(),
    },
    items,
    skipped,
  };
}

function renderMarkdownReport(report) {
  const lines = [
    '# Google Merchant API Sync',
    '',
    '## Summary',
    '',
    `- mode: ${report.summary.mode}`,
    `- plannedInsertCount: ${report.summary.plannedInsertCount}`,
    `- insertedCount: ${report.summary.insertedCount}`,
    `- failedCount: ${report.summary.failedCount}`,
    `- skippedCount: ${report.summary.skippedCount}`,
    '',
    '## Sample Items',
    '',
    '| status | artworkId | offerId | title |',
    '| --- | --- | --- | --- |',
    ...report.items.slice(0, 20).map((item) => {
      const title =
        item.productInput.customAttributes.find((attr) => attr.name === 'title')?.value || '';
      return `| ${item.status} | ${item.artworkId} | ${item.productInput.offerId} | ${title.replace(/\|/g, '/')} |`;
    }),
    '',
    '## Skipped',
    '',
    '| artworkId | reason |',
    '| --- | --- |',
    ...report.skipped.slice(0, 50).map((item) => `| ${item.artworkId} | ${item.reason} |`),
    '',
  ];
  return lines.join('\n');
}

function writeReports({ outDir, reportDate = todayIsoDate(), report }) {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `google-merchant-sync-${reportDate}.json`);
  const mdPath = path.join(outDir, `google-merchant-sync-${reportDate}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, renderMarkdownReport(report));
  return { jsonPath, mdPath };
}

async function main() {
  loadDotenv();
  registerPathAlias();
  const jiti = getTsLoader();

  const options = parseArgs(process.argv.slice(2));
  const { getSupabaseArtworks } = jiti('../lib/supabase-data.ts');
  const { buildMerchantSyncCandidates, getMerchantProductInputName } = jiti(
    '../lib/google-merchant/product-mapper.ts'
  );
  const { createMerchantApiClient } = jiti('../lib/google-merchant/client.ts');

  if (options.deleteId) {
    if (options.dryRun) {
      const report = {
        summary: {
          mode: 'dry-run',
          plannedInsertCount: 0,
          insertedCount: 0,
          failedCount: 0,
          skippedCount: 0,
          plannedDeleteId: options.deleteId,
          generatedAt: new Date().toISOString(),
        },
        items: [],
        skipped: [],
      };
      const written = writeReports({ outDir: options.outDir, report });
      console.log(JSON.stringify({ summary: report.summary, reports: written }, null, 2));
      return;
    }

    const { getMerchantClientConfig } = jiti('../lib/google-merchant/client.ts');
    const config = getMerchantClientConfig();
    const client = await createMerchantApiClient(config);
    const name = getMerchantProductInputName(`accounts/${config.accountId}`, options.deleteId);
    await client.deleteProductInput(name);
    const report = {
      summary: {
        mode: 'apply',
        plannedInsertCount: 0,
        insertedCount: 0,
        failedCount: 0,
        skippedCount: 0,
        deletedId: options.deleteId,
        deletedName: name,
        generatedAt: new Date().toISOString(),
      },
      items: [],
      skipped: [],
    };
    const written = writeReports({ outDir: options.outDir, report });
    console.log(JSON.stringify({ summary: report.summary, reports: written }, null, 2));
    return;
  }

  const artworks = await getSupabaseArtworks();
  const { products, skipped } = buildMerchantSyncCandidates(artworks);

  let insertProduct = async () => {
    throw new Error('insertProduct should not be called in dry-run mode');
  };

  if (!options.dryRun) {
    const client = await createMerchantApiClient();
    insertProduct = (productInput) => client.insertProductInput(productInput);
  }

  const report = await createSyncPlan({ products, skipped, options, insertProduct });
  const written = writeReports({ outDir: options.outDir, report });
  console.log(JSON.stringify({ summary: report.summary, reports: written }, null, 2));

  if (report.summary.failedCount > 0) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  createSyncPlan,
  parseArgs,
  renderMarkdownReport,
  writeReports,
};
