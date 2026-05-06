/**
 * Lighthouse-style coverage analysis using Playwright + Chrome DevTools Protocol.
 *
 * 실행:
 *   npx tsx scripts/lighthouse-coverage.ts [URL]
 *   npx tsx scripts/lighthouse-coverage.ts https://www.saf2026.com/artworks
 *
 * 출력:
 *   - JS / CSS 별 사용/미사용 바이트 합계
 *   - 파일별 미사용 % 정렬 (worst offenders)
 *   - .next/ chunk hash → 가능한 source 매칭 시도
 *   - JSON dump → tmp/coverage-<timestamp>.json
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface CoverageRange {
  start: number;
  end: number;
}
interface CoverageEntry {
  url: string;
  text?: string;
  ranges: CoverageRange[];
}

interface FileSummary {
  url: string;
  type: 'js' | 'css';
  totalBytes: number;
  usedBytes: number;
  unusedBytes: number;
  unusedPct: number;
}

const TARGET_URL = process.argv[2] ?? 'https://www.saf2026.com/';

function bytesToKiB(n: number): string {
  return `${(n / 1024).toFixed(1)} KiB`;
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.pathname.includes('/_next/static/')) {
      const parts = u.pathname.split('/');
      const last = parts[parts.length - 1];
      const folder = parts[parts.length - 2];
      return `${folder}/${last}`;
    }
    return u.pathname.length > 80 ? `…${u.pathname.slice(-77)}` : u.pathname;
  } catch {
    return url.slice(0, 80);
  }
}

function classify(url: string): 'js' | 'css' | null {
  if (url.endsWith('.js') || url.includes('.js?')) return 'js';
  if (url.endsWith('.css') || url.includes('.css?')) return 'css';
  return null;
}

function summarize(entries: CoverageEntry[]): FileSummary[] {
  const summaries: FileSummary[] = [];
  for (const entry of entries) {
    const type = classify(entry.url);
    if (!type) continue;
    const totalBytes = entry.text?.length ?? 0;
    if (totalBytes === 0) continue;

    const usedBytes = entry.ranges.reduce((acc, r) => acc + (r.end - r.start), 0);
    const unusedBytes = Math.max(0, totalBytes - usedBytes);
    summaries.push({
      url: entry.url,
      type,
      totalBytes,
      usedBytes,
      unusedBytes,
      unusedPct: totalBytes > 0 ? (unusedBytes / totalBytes) * 100 : 0,
    });
  }
  return summaries;
}

function aggregateByOrigin(summaries: FileSummary[]) {
  const buckets = new Map<string, { total: number; unused: number; count: number }>();
  for (const s of summaries) {
    let key: string;
    try {
      const u = new URL(s.url);
      if (u.pathname.includes('/_next/static/chunks')) key = '_next/static/chunks';
      else if (u.pathname.includes('/_next/static/css')) key = '_next/static/css';
      else if (u.pathname.includes('/_next/static/')) key = '_next/static (other)';
      else if (u.hostname.includes('googletagmanager')) key = 'googletagmanager';
      else if (u.hostname.includes('google-analytics')) key = 'google-analytics';
      else key = u.hostname;
    } catch {
      key = 'unknown';
    }
    const cur = buckets.get(key) ?? { total: 0, unused: 0, count: 0 };
    cur.total += s.totalBytes;
    cur.unused += s.unusedBytes;
    cur.count += 1;
    buckets.set(key, cur);
  }
  return Array.from(buckets.entries())
    .map(([key, v]) => ({
      origin: key,
      ...v,
      unusedPct: v.total > 0 ? (v.unused / v.total) * 100 : 0,
    }))
    .sort((a, b) => b.unused - a.unused);
}

async function main() {
  console.log(`\n[coverage] target: ${TARGET_URL}\n`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  await page.coverage.startCSSCoverage({ resetOnNavigation: false });

  await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 60_000 });
  // viewport scroll → lazy 자원 트리거
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(2_000);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2_000);

  const jsCov = (await page.coverage.stopJSCoverage()) as unknown as CoverageEntry[];
  const cssCov = (await page.coverage.stopCSSCoverage()) as unknown as CoverageEntry[];
  await browser.close();

  // Playwright JS coverage: { url, source, functions: [{ ranges: [{ startOffset, endOffset, count }] }] }
  // CSS coverage: { url, text, ranges: [{ start, end }] } — already covered ranges (ranges = used)
  type RawJsRange = { startOffset: number; endOffset: number; count: number };
  type RawJsEntry = {
    url: string;
    source?: string;
    functions: Array<{ ranges: RawJsRange[] }>;
  };

  // Merge overlapping ranges where count > 0 to compute used bytes accurately.
  function mergeUsedRanges(rawRanges: RawJsRange[]): CoverageRange[] {
    const used = rawRanges
      .filter((r) => r.count > 0)
      .map((r) => ({ start: r.startOffset, end: r.endOffset }))
      .sort((a, b) => a.start - b.start);
    if (used.length === 0) return [];
    const merged: CoverageRange[] = [used[0]];
    for (let i = 1; i < used.length; i++) {
      const last = merged[merged.length - 1];
      const cur = used[i];
      if (cur.start <= last.end) last.end = Math.max(last.end, cur.end);
      else merged.push(cur);
    }
    return merged;
  }

  const jsEntries: CoverageEntry[] = (jsCov as unknown as RawJsEntry[]).map((entry) => ({
    url: entry.url,
    text: entry.source,
    ranges: mergeUsedRanges(entry.functions.flatMap((fn) => fn.ranges)),
  }));

  const summaries = [...summarize(jsEntries), ...summarize(cssCov)];
  const totalBytes = summaries.reduce((acc, s) => acc + s.totalBytes, 0);
  const totalUnused = summaries.reduce((acc, s) => acc + s.unusedBytes, 0);

  const jsTotal = summaries.filter((s) => s.type === 'js').reduce((a, s) => a + s.totalBytes, 0);
  const jsUnused = summaries.filter((s) => s.type === 'js').reduce((a, s) => a + s.unusedBytes, 0);
  const cssTotal = summaries.filter((s) => s.type === 'css').reduce((a, s) => a + s.totalBytes, 0);
  const cssUnused = summaries
    .filter((s) => s.type === 'css')
    .reduce((a, s) => a + s.unusedBytes, 0);

  console.log('=== Summary ===');
  console.log(
    `JS  total ${bytesToKiB(jsTotal)} | unused ${bytesToKiB(jsUnused)} (${((jsUnused / jsTotal) * 100).toFixed(1)}%)`
  );
  console.log(
    `CSS total ${bytesToKiB(cssTotal)} | unused ${bytesToKiB(cssUnused)} (${((cssUnused / cssTotal) * 100).toFixed(1)}%)`
  );
  console.log(
    `ALL total ${bytesToKiB(totalBytes)} | unused ${bytesToKiB(totalUnused)} (${((totalUnused / totalBytes) * 100).toFixed(1)}%)\n`
  );

  console.log('=== By origin (sorted by unused bytes) ===');
  const byOrigin = aggregateByOrigin(summaries);
  for (const o of byOrigin) {
    console.log(
      `  ${o.origin.padEnd(28)} ${bytesToKiB(o.total).padStart(11)} | unused ${bytesToKiB(o.unused).padStart(11)} (${o.unusedPct.toFixed(1).padStart(5)}%) [${o.count} files]`
    );
  }

  console.log('\n=== Worst offenders (top 20 by unused bytes) ===');
  const worst = [...summaries].sort((a, b) => b.unusedBytes - a.unusedBytes).slice(0, 20);
  for (const f of worst) {
    console.log(
      `  [${f.type}] ${shortenUrl(f.url).padEnd(60)} ${bytesToKiB(f.totalBytes).padStart(10)} | unused ${bytesToKiB(f.unusedBytes).padStart(10)} (${f.unusedPct.toFixed(1).padStart(5)}%)`
    );
  }

  // dump JSON for further analysis
  const tmpDir = join(process.cwd(), 'tmp');
  mkdirSync(tmpDir, { recursive: true });
  const out = join(tmpDir, `coverage-${Date.now()}.json`);
  writeFileSync(
    out,
    JSON.stringify(
      {
        target: TARGET_URL,
        capturedAt: new Date().toISOString(),
        summary: { jsTotal, jsUnused, cssTotal, cssUnused, totalBytes, totalUnused },
        byOrigin,
        files: summaries.sort((a, b) => b.unusedBytes - a.unusedBytes),
      },
      null,
      2
    )
  );
  console.log(`\n[coverage] JSON dump → ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
