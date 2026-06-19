import fs from 'node:fs';
import path from 'node:path';

describe('reconcile-payments virtual-account reservation source contract', () => {
  const srcPath = path.join(process.cwd(), 'app/api/internal/reconcile-payments/route.ts');

  it('uses the shared reservation helper before moving Toss virtual-account orders to awaiting_deposit', () => {
    const src = fs.readFileSync(srcPath, 'utf8');

    expect(src).toContain('reserveUniqueArtworksOrRollback');
    expect(src.indexOf('reserveUniqueArtworksOrRollback')).toBeLessThan(
      src.indexOf("status: 'awaiting_deposit'")
    );
    expect(src).not.toContain(".update({ status: 'reserved' })");
  });
});
