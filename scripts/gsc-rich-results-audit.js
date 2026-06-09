#!/usr/bin/env node

/**
 * GSC rich results audit.
 *
 * Usage:
 *   node scripts/gsc-rich-results-audit.js --dry-run
 *   node scripts/gsc-rich-results-audit.js --limit 50
 *   node scripts/gsc-rich-results-audit.js --days 28
 */

const fs = require('node:fs');
const path = require('node:path');
const { google } = require('googleapis');

const DEFAULT_DAYS = 28;
const DEFAULT_ANALYTICS_LIMIT = 250;
const DEFAULT_OUT_DIR = 'reports';
const DEFAULT_DELAY_MS = 1000;

function parseArgs(argv) {
  const options = {
    days: DEFAULT_DAYS,
    analyticsLimit: DEFAULT_ANALYTICS_LIMIT,
    limit: null,
    outDir: DEFAULT_OUT_DIR,
    delayMs: DEFAULT_DELAY_MS,
    concurrency: 3,
    progressEvery: 25,
    dryRun: false,
    includeSitemap: true,
    write: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--dry-run') {
      options.dryRun = true;
      options.limit = 3;
      options.write = false;
    } else if (arg === '--no-sitemap') {
      options.includeSitemap = false;
    } else if (arg === '--limit' && next) {
      options.limit = Number(next);
      i += 1;
    } else if (arg === '--days' && next) {
      options.days = Number(next);
      i += 1;
    } else if (arg === '--analytics-limit' && next) {
      options.analyticsLimit = Number(next);
      i += 1;
    } else if (arg === '--out-dir' && next) {
      options.outDir = next;
      i += 1;
    } else if (arg === '--delay-ms' && next) {
      options.delayMs = Number(next);
      i += 1;
    } else if (arg === '--concurrency' && next) {
      options.concurrency = Number(next);
      i += 1;
    } else if (arg === '--progress-every' && next) {
      options.progressEvery = Number(next);
      i += 1;
    } else if (arg === '--start-date' && next) {
      options.startDate = next;
      i += 1;
    } else if (arg === '--end-date' && next) {
      options.endDate = next;
      i += 1;
    }
  }

  return options;
}

function loadDotenv() {
  const candidates = ['.env.local', '.env.production.local', '.env'];
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      require('dotenv').config({ path: file });
    }
  }
}

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`[gsc-rich-results-audit] missing env: ${key}`);
  return value;
}

function getDateRange(options) {
  if (options.startDate && options.endDate) {
    return { startDate: options.startDate, endDate: options.endDate };
  }

  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 3);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (options.days - 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function getGscClient() {
  const rawSaKey = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (rawSaKey) {
    const key = JSON.parse(rawSaKey);
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return google.searchconsole({ version: 'v1', auth });
  }

  const clientId = requireEnv('GSC_OAUTH_CLIENT_ID');
  const clientSecret = requireEnv('GSC_OAUTH_CLIENT_SECRET');
  const refreshToken = requireEnv('GSC_OAUTH_REFRESH_TOKEN');
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.searchconsole({ version: 'v1', auth: oauth2 });
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function getOriginFromSiteUrl(siteUrl) {
  if (siteUrl.startsWith('sc-domain:')) {
    return `https://www.${siteUrl.replace('sc-domain:', '')}`;
  }
  return siteUrl.replace(/\/$/, '');
}

async function fetchSearchAnalyticsUrls(client, siteUrl, dateRange, rowLimit) {
  const res = await client.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      dimensions: ['page'],
      rowLimit,
      dataState: 'final',
    },
  });

  return (res.data.rows || [])
    .map((row) => normalizeUrl(row.keys?.[0] || ''))
    .filter(Boolean);
}

function extractXmlLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)].map((match) =>
    match[1].replace(/&amp;/g, '&')
  );
}

async function fetchSitemapUrls(baseUrl, visited = new Set()) {
  const sitemapUrl = `${baseUrl.replace(/\/$/, '')}/sitemap.xml`;
  return fetchSitemapUrl(sitemapUrl, visited);
}

async function fetchSitemapUrl(sitemapUrl, visited = new Set()) {
  if (visited.has(sitemapUrl)) return [];
  visited.add(sitemapUrl);

  const res = await fetch(sitemapUrl);
  if (!res.ok) throw new Error(`sitemap fetch failed ${res.status}: ${sitemapUrl}`);
  const xml = await res.text();
  const locs = extractXmlLocs(xml);
  const urls = [];

  for (const loc of locs) {
    if (/\.xml(\?|$)/.test(loc)) {
      urls.push(...(await fetchSitemapUrl(loc, visited)));
    } else {
      const normalized = normalizeUrl(loc);
      if (normalized) urls.push(normalized);
    }
  }

  return urls;
}

function uniqueUrls(urls) {
  return [...new Set(urls.filter(Boolean))].sort();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function inspectUrl(client, siteUrl, url) {
  const res = await client.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: url,
      siteUrl,
    },
  });
  const result = res.data.inspectionResult || {};
  return {
    url,
    indexStatus: {
      verdict: result.indexStatusResult?.verdict || null,
      coverageState: result.indexStatusResult?.coverageState || null,
      robotsTxtState: result.indexStatusResult?.robotsTxtState || null,
      indexingState: result.indexStatusResult?.indexingState || null,
      pageFetchState: result.indexStatusResult?.pageFetchState || null,
      googleCanonical: result.indexStatusResult?.googleCanonical || null,
      userCanonical: result.indexStatusResult?.userCanonical || null,
    },
    richResults: {
      verdict: result.richResultsResult?.verdict || null,
      detectedItems: result.richResultsResult?.detectedItems || [],
    },
  };
}

async function inspectUrls(client, siteUrl, urls, options) {
  const results = new Array(urls.length);
  let nextIndex = 0;
  let completed = 0;
  const concurrency = Math.max(1, Number(options.concurrency || 1));

  async function worker() {
    while (nextIndex < urls.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const url = urls[currentIndex];

      try {
        results[currentIndex] = await inspectUrl(client, siteUrl, url);
      } catch (err) {
        results[currentIndex] = {
          url,
          error: err.response?.data?.error?.message || err.message || String(err),
        };
      }

      completed += 1;
      if (
        options.progressEvery > 0 &&
        (completed === 1 || completed % options.progressEvery === 0 || completed === urls.length)
      ) {
        console.log(`[gsc-rich-results-audit] inspected ${completed}/${urls.length}`);
      }

      if (nextIndex < urls.length && options.delayMs > 0) {
        await delay(options.delayMs);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, () => worker()));
  return results;
}

function classifyUrl(rawUrl) {
  const fallback = {
    pageType: 'other',
    routePattern: '(unknown)',
    schemaSources: ['Route-specific JSON-LD'],
    codePointers: ['app/[locale]/**/page.tsx', 'lib/schemas/**'],
  };

  let pathname;
  try {
    pathname = new URL(rawUrl).pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  } catch {
    return fallback;
  }

  if (pathname === '/') {
    return {
      pageType: 'home',
      routePattern: '/',
      schemaSources: ['Organization', 'WebSite', 'FAQPage', 'QAPage'],
      codePointers: ['app/[locale]/page.tsx', 'app/[locale]/layout.tsx'],
    };
  }
  if (pathname === '/artworks') {
    return {
      pageType: 'artwork_gallery',
      routePattern: '/artworks',
      schemaSources: ['CollectionPage', 'ItemList', 'AggregateOffer', 'FAQPage'],
      codePointers: ['app/[locale]/artworks/page.tsx', 'lib/schemas/artwork.ts'],
    };
  }
  if (pathname.startsWith('/artworks/artist/')) {
    return {
      pageType: 'artist_page',
      routePattern: '/artworks/artist/[artist]',
      schemaSources: ['Person', 'ItemList VisualArtwork', 'BreadcrumbList'],
      codePointers: ['app/[locale]/artworks/artist/[artist]/page.tsx', 'lib/schemas/artist.ts'],
    };
  }
  if (pathname.startsWith('/artworks/category/')) {
    return {
      pageType: 'artwork_category',
      routePattern: '/artworks/category/[category]',
      schemaSources: ['CollectionPage', 'ItemList VisualArtwork', 'AggregateOffer', 'FAQPage'],
      codePointers: ['app/[locale]/artworks/category/[category]/page.tsx', 'lib/schemas/artwork.ts'],
    };
  }
  if (pathname.startsWith('/artworks/')) {
    return {
      pageType: 'artwork_detail',
      routePattern: '/artworks/[id]',
      schemaSources: ['VisualArtwork', 'ImageObject', 'BreadcrumbList', 'FAQPage'],
      codePointers: ['app/[locale]/artworks/[id]/page.tsx', 'lib/schemas/artwork.ts'],
    };
  }
  if (pathname.startsWith('/stories/category/')) {
    return {
      pageType: 'magazine_category',
      routePattern: '/stories/category/[category]',
      schemaSources: ['CollectionPage', 'ItemList BlogPosting', 'FAQPage'],
      codePointers: ['app/[locale]/stories/category/[category]/page.tsx', 'lib/schemas/content.ts'],
    };
  }
  if (pathname.startsWith('/stories/') && pathname !== '/stories/guide') {
    return {
      pageType: 'magazine_story',
      routePattern: '/stories/[slug]',
      schemaSources: ['BlogPosting', 'BreadcrumbList', 'FAQPage', 'ItemList VisualArtwork'],
      codePointers: ['app/[locale]/stories/[slug]/page.tsx', 'lib/schemas/content.ts'],
    };
  }
  if (pathname.startsWith('/petition/')) {
    return {
      pageType: 'petition',
      routePattern: '/petition/[slug]',
      schemaSources: ['BreadcrumbList', 'FAQPage', 'CreativeWork'],
      codePointers: ['app/[locale]/petition/oh-yoon/page.tsx'],
    };
  }
  if (pathname.startsWith('/special/')) {
    return {
      pageType: 'special_feature',
      routePattern: '/special/[slug]',
      schemaSources: ['Person', 'VisualArtwork', 'ExhibitionEvent'],
      codePointers: ['app/[locale]/special/**/page.tsx', 'components/special/**'],
    };
  }
  if (pathname.startsWith('/archive/')) {
    return {
      pageType: 'archive',
      routePattern: '/archive/[year]',
      schemaSources: ['ExhibitionEvent', 'VideoObject', 'ItemList'],
      codePointers: ['app/[locale]/archive/**/page.tsx', 'lib/schemas/event.ts'],
    };
  }
  if (pathname === '/faq') {
    return {
      pageType: 'faq',
      routePattern: '/faq',
      schemaSources: ['FAQPage', 'BreadcrumbList'],
      codePointers: ['app/[locale]/faq/page.tsx', 'lib/schemas/content.ts'],
    };
  }

  return fallback;
}

function getIssuePriority(severity) {
  if (severity === 'ERROR') return 'P1';
  if (severity === 'WARNING') return 'P2';
  return 'P3';
}

function normalizeIssue(issue) {
  return {
    severity: issue.severity || 'UNKNOWN',
    message: issue.issueMessage || issue.issueType || 'Unknown issue',
  };
}

function summarizeInspectionResults(results) {
  const groups = new Map();
  const totals = {
    inspectedUrls: results.length,
    indexedUrls: 0,
    richResultPassUrls: 0,
    richResultFailUrls: 0,
    errorIssues: 0,
    warningIssues: 0,
    failedInspections: 0,
  };
  const retryUrls = [];

  for (const result of results) {
    if (result.error) {
      totals.failedInspections += 1;
      retryUrls.push(result.url);
      continue;
    }
    if (result.indexStatus?.verdict === 'PASS') totals.indexedUrls += 1;
    if (result.richResults?.verdict === 'PASS') totals.richResultPassUrls += 1;
    if (result.richResults?.verdict === 'FAIL') totals.richResultFailUrls += 1;

    for (const detected of result.richResults?.detectedItems || []) {
      for (const item of detected.items || []) {
        for (const rawIssue of item.issues || []) {
          const issue = normalizeIssue(rawIssue);
          if (issue.severity === 'ERROR') totals.errorIssues += 1;
          if (issue.severity === 'WARNING') totals.warningIssues += 1;

          const key = `${detected.richResultType}::${issue.severity}::${issue.message}`;
          const route = classifyUrl(result.url);
          if (!groups.has(key)) {
            groups.set(key, {
              priority: getIssuePriority(issue.severity),
              severity: issue.severity,
              richResultType: detected.richResultType || 'Unknown rich result',
              message: issue.message,
              count: 0,
              urls: [],
              pageTypes: [],
              codePointers: [],
            });
          }
          const group = groups.get(key);
          group.count += 1;
          if (!group.urls.includes(result.url)) group.urls.push(result.url);
          if (!group.pageTypes.includes(route.pageType)) group.pageTypes.push(route.pageType);
          for (const pointer of route.codePointers) {
            if (!group.codePointers.includes(pointer)) group.codePointers.push(pointer);
          }
        }
      }
    }
  }

  const issueGroups = [...groups.values()].sort((a, b) => {
    const priorityCompare = a.priority.localeCompare(b.priority);
    if (priorityCompare !== 0) return priorityCompare;
    return b.count - a.count;
  });

  return { totals, issueGroups, retryUrls };
}

function renderMarkdownReport(report) {
  const lines = [];
  lines.push('# GSC Rich Results Audit');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Date range: ${report.dateRange.startDate} ~ ${report.dateRange.endDate}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Count |');
  lines.push('| --- | ---: |');
  lines.push(`| Search Analytics URLs | ${report.source.analyticsUrls} |`);
  lines.push(`| Sitemap URLs | ${report.source.sitemapUrls} |`);
  lines.push(`| Target URLs | ${report.source.targetUrls} |`);
  lines.push(`| Inspected URLs | ${report.totals.inspectedUrls} |`);
  lines.push(`| Indexed URLs | ${report.totals.indexedUrls} |`);
  lines.push(`| Rich result PASS URLs | ${report.totals.richResultPassUrls} |`);
  lines.push(`| Rich result FAIL URLs | ${report.totals.richResultFailUrls} |`);
  lines.push(`| ERROR issues | ${report.totals.errorIssues} |`);
  lines.push(`| WARNING issues | ${report.totals.warningIssues} |`);
  lines.push(`| Failed inspections | ${report.totals.failedInspections} |`);
  lines.push('');
  lines.push('## Issue Groups');
  lines.push('');

  if (report.issueGroups.length === 0) {
    lines.push('No rich result issues were reported by URL Inspection API.');
  } else {
    lines.push('| Priority | Severity | Rich result | Count | Message | Page types | Code pointers | Example URL |');
    lines.push('| --- | --- | --- | ---: | --- | --- | --- | --- |');
    for (const group of report.issueGroups) {
      lines.push(
        `| ${[
          group.priority,
          group.severity,
          group.richResultType,
          String(group.count),
          group.message.replace(/\|/g, '\\|'),
          group.pageTypes.join(', '),
          group.codePointers.join('<br>'),
          group.urls[0] || '',
        ].join(' | ')} |`
      );
    }
  }

  lines.push('');
  lines.push('## Retry URLs');
  lines.push('');
  if (report.retryUrls.length === 0) {
    lines.push('No failed inspections.');
  } else {
    for (const url of report.retryUrls) lines.push(`- ${url}`);
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

function buildReport({ generatedAt, dateRange, source, inspectionResults }) {
  const summary = summarizeInspectionResults(inspectionResults);
  return {
    generatedAt,
    dateRange,
    source,
    totals: summary.totals,
    issueGroups: summary.issueGroups,
    retryUrls: summary.retryUrls,
    inspectionResults,
  };
}

async function runAudit(options) {
  loadDotenv();
  const siteUrl = requireEnv('GSC_SITE_URL');
  const baseUrl = getOriginFromSiteUrl(siteUrl);
  const client = getGscClient();
  const dateRange = getDateRange(options);

  const analyticsUrls = await fetchSearchAnalyticsUrls(
    client,
    siteUrl,
    dateRange,
    options.analyticsLimit
  );
  const sitemapUrls = options.includeSitemap ? await fetchSitemapUrls(baseUrl) : [];
  let targetUrls = uniqueUrls([...analyticsUrls, ...sitemapUrls]);
  if (options.limit) targetUrls = targetUrls.slice(0, options.limit);

  console.log(
    `[gsc-rich-results-audit] analytics=${analyticsUrls.length} sitemap=${sitemapUrls.length} target=${targetUrls.length} concurrency=${options.concurrency}`
  );

  const inspectionResults = await inspectUrls(client, siteUrl, targetUrls, options);
  const report = buildReport({
    generatedAt: new Date().toISOString(),
    dateRange,
    source: {
      analyticsUrls: analyticsUrls.length,
      sitemapUrls: sitemapUrls.length,
      targetUrls: targetUrls.length,
    },
    inspectionResults,
  });

  if (options.write) {
    fs.mkdirSync(options.outDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 10);
    const jsonPath = path.join(options.outDir, `gsc-rich-results-audit-${stamp}.json`);
    const mdPath = path.join(options.outDir, `gsc-rich-results-audit-${stamp}.md`);
    fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(mdPath, renderMarkdownReport(report), 'utf8');
    return { report, jsonPath, mdPath };
  }

  return { report };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { report, jsonPath, mdPath } = await runAudit(options);
  if (jsonPath && mdPath) {
    console.log(`json=${jsonPath}`);
    console.log(`markdown=${mdPath}`);
  }
  console.log(
    JSON.stringify(
      {
        dryRun: options.dryRun,
        totals: report.totals,
        issueGroups: report.issueGroups.map((group) => ({
          priority: group.priority,
          severity: group.severity,
          richResultType: group.richResultType,
          count: group.count,
          message: group.message,
        })),
        retryUrls: report.retryUrls,
      },
      null,
      2
    )
  );
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.response?.data || err.message || err);
    process.exit(1);
  });
}

module.exports = {
  buildReport,
  classifyUrl,
  extractXmlLocs,
  getIssuePriority,
  normalizeIssue,
  parseArgs,
  renderMarkdownReport,
  summarizeInspectionResults,
};
