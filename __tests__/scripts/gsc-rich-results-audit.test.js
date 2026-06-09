const {
  classifyUrl,
  getIssuePriority,
  summarizeInspectionResults,
  renderMarkdownReport,
} = require('../../scripts/gsc-rich-results-audit');

describe('gsc-rich-results-audit helpers', () => {
  it('classifies SAF routes to likely schema source areas', () => {
    expect(classifyUrl('https://www.saf2026.com/stories/editions-explained')).toEqual({
      pageType: 'magazine_story',
      routePattern: '/stories/[slug]',
      schemaSources: ['BlogPosting', 'BreadcrumbList', 'FAQPage', 'ItemList VisualArtwork'],
      codePointers: ['app/[locale]/stories/[slug]/page.tsx', 'lib/schemas/content.ts'],
    });

    expect(
      classifyUrl('https://www.saf2026.com/artworks/aa919279-9df7-4433-acf6-c33a4ac8173d')
        .pageType
    ).toBe('artwork_detail');
  });

  it('maps issue severities to report priorities', () => {
    expect(getIssuePriority('ERROR')).toBe('P1');
    expect(getIssuePriority('WARNING')).toBe('P2');
    expect(getIssuePriority('UNKNOWN')).toBe('P3');
  });

  it('groups rich result issues by type, severity, and message', () => {
    const summary = summarizeInspectionResults([
      {
        url: 'https://www.saf2026.com/stories/editions-explained',
        indexStatus: { verdict: 'PASS', coverageState: 'Submitted and indexed' },
        richResults: {
          verdict: 'FAIL',
          detectedItems: [
            {
              richResultType: 'Product snippets',
              items: [
                {
                  name: '작품 A',
                  issues: [
                    {
                      severity: 'ERROR',
                      issueMessage:
                        'Either "offers", "review", or "aggregateRating" should be specified',
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        url: 'https://www.saf2026.com/artworks/aa919279-9df7-4433-acf6-c33a4ac8173d',
        indexStatus: { verdict: 'PASS', coverageState: 'Submitted and indexed' },
        richResults: {
          verdict: 'PASS',
          detectedItems: [
            {
              richResultType: 'Image Metadata',
              items: [
                {
                  name: 'ImageObject',
                  issues: [{ severity: 'WARNING', issueMessage: 'Missing field "creditText"' }],
                },
              ],
            },
          ],
        },
      },
    ]);

    expect(summary.totals).toEqual({
      inspectedUrls: 2,
      indexedUrls: 2,
      richResultPassUrls: 1,
      richResultFailUrls: 1,
      errorIssues: 1,
      warningIssues: 1,
      failedInspections: 0,
    });
    expect(summary.issueGroups).toEqual([
      {
        priority: 'P1',
        severity: 'ERROR',
        richResultType: 'Product snippets',
        message: 'Either "offers", "review", or "aggregateRating" should be specified',
        count: 1,
        urls: ['https://www.saf2026.com/stories/editions-explained'],
        pageTypes: ['magazine_story'],
        codePointers: ['app/[locale]/stories/[slug]/page.tsx', 'lib/schemas/content.ts'],
      },
      {
        priority: 'P2',
        severity: 'WARNING',
        richResultType: 'Image Metadata',
        message: 'Missing field "creditText"',
        count: 1,
        urls: ['https://www.saf2026.com/artworks/aa919279-9df7-4433-acf6-c33a4ac8173d'],
        pageTypes: ['artwork_detail'],
        codePointers: ['app/[locale]/artworks/[id]/page.tsx', 'lib/schemas/artwork.ts'],
      },
    ]);
  });

  it('renders markdown with totals, issue groups, and retry URLs', () => {
    const markdown = renderMarkdownReport({
      generatedAt: '2026-06-09T00:00:00.000Z',
      dateRange: { startDate: '2026-05-10', endDate: '2026-06-06' },
      source: { analyticsUrls: 2, sitemapUrls: 3, targetUrls: 4 },
      totals: {
        inspectedUrls: 1,
        indexedUrls: 1,
        richResultPassUrls: 0,
        richResultFailUrls: 1,
        errorIssues: 1,
        warningIssues: 0,
        failedInspections: 1,
      },
      issueGroups: [
        {
          priority: 'P1',
          severity: 'ERROR',
          richResultType: 'Product snippets',
          message: 'Either "offers", "review", or "aggregateRating" should be specified',
          count: 1,
          urls: ['https://www.saf2026.com/stories/editions-explained'],
          pageTypes: ['magazine_story'],
          codePointers: ['app/[locale]/stories/[slug]/page.tsx'],
        },
      ],
      retryUrls: ['https://www.saf2026.com/timeout'],
    });

    expect(markdown).toContain('# GSC Rich Results Audit');
    expect(markdown).toContain('| Inspected URLs | 1 |');
    expect(markdown).toContain('Product snippets');
    expect(markdown).toContain('https://www.saf2026.com/timeout');
  });
});
