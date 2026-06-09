import { readFileSync } from 'node:fs';
import path from 'node:path';

const nextConfigSource = readFileSync(path.join(process.cwd(), 'next.config.js'), 'utf8');

describe('Next.js Server Actions config', () => {
  it('allows email image uploads up to the app-level 2MB limit', () => {
    expect(nextConfigSource).toContain('serverActions');
    expect(nextConfigSource).toContain("bodySizeLimit: '3mb'");
  });
});
