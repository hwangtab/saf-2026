const fs = require('node:fs');
const path = require('node:path');

const {
  createSyncPlan,
  parseArgs,
  writeReports,
} = require('../../scripts/google-merchant-sync');

const sampleProducts = [
  {
    artworkId: 'art-1',
    productInput: {
      offerId: 'art-1',
      contentLanguage: 'ko',
      feedLabel: 'KR',
      customAttributes: [{ name: 'title', value: '작품 1' }],
    },
  },
  {
    artworkId: 'art-2',
    productInput: {
      offerId: 'art-2',
      contentLanguage: 'ko',
      feedLabel: 'KR',
      customAttributes: [{ name: 'title', value: '작품 2' }],
    },
  },
];

describe('google-merchant-sync script helpers', () => {
  it('defaults to dry-run and only applies with --apply', () => {
    expect(parseArgs([]).dryRun).toBe(true);
    expect(parseArgs(['--apply']).dryRun).toBe(false);
    expect(parseArgs(['--delete-id', 'art-1']).deleteId).toBe('art-1');
  });

  it('limits sync candidates and never calls the API in dry-run plans', async () => {
    const calls = [];
    const plan = await createSyncPlan({
      products: sampleProducts,
      options: { dryRun: true, limit: 1 },
      insertProduct: async (product) => {
        calls.push(product);
      },
    });

    expect(plan.summary.mode).toBe('dry-run');
    expect(plan.summary.plannedInsertCount).toBe(1);
    expect(plan.items).toHaveLength(1);
    expect(calls).toHaveLength(0);
  });

  it('writes JSON and Markdown reports', () => {
    const outDir = path.join(process.cwd(), 'tmp-google-merchant-test-reports');
    fs.rmSync(outDir, { force: true, recursive: true });

    const result = writeReports({
      outDir,
      reportDate: '2026-06-09',
      report: {
        summary: {
          mode: 'dry-run',
          plannedInsertCount: 2,
          insertedCount: 0,
          failedCount: 0,
          skippedCount: 3,
        },
        items: sampleProducts,
        skipped: [{ artworkId: 'sold-1', reason: 'sold' }],
      },
    });

    expect(fs.existsSync(result.jsonPath)).toBe(true);
    expect(fs.existsSync(result.mdPath)).toBe(true);
    expect(fs.readFileSync(result.mdPath, 'utf8')).toContain('plannedInsertCount');

    fs.rmSync(outDir, { force: true, recursive: true });
  });
});
