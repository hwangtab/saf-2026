import { readFileSync } from 'node:fs';
import path from 'node:path';

const OUR_PROOF_PAGE_PATH = path.join(process.cwd(), 'app', '[locale]', 'our-proof', 'page.tsx');

describe('our-proof FAQ wiring', () => {
  const source = readFileSync(OUR_PROOF_PAGE_PATH, 'utf8');

  it('should derive both rendered FAQ items and FAQPage schema from getOurProofFaqSchema', () => {
    expect(source).toContain("import { getOurProofFaqSchema } from '@/lib/schemas/our-proof-faq';");
    expect(source).toContain(
      'const { items: proofFaqItems, schema: proofFaqSchema } = getOurProofFaqSchema(locale);'
    );
  });

  it('should render FAQ items and inject FAQ schema in both locale branches', () => {
    const renderedFaqCount = (source.match(/\{proofFaqItems\.map\(\(item\) => \(/g) || []).length;
    const injectedFaqSchemaCount = (
      source.match(
        /data=\{\[breadcrumbSchema, aboutPageSchema, datasetSchema, loanSchema, proofFaqSchema\]\}/g
      ) || []
    ).length;

    expect(renderedFaqCount).toBe(2);
    expect(injectedFaqSchemaCount).toBe(2);
  });
});
