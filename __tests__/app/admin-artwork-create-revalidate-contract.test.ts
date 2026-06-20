import { readFileSync } from 'node:fs';

describe('admin artwork create revalidate contract', () => {
  it('does not attach public artwork invalidation to the create server action response', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
    const createBlock = src.slice(
      src.indexOf('async function createAdminArtworkRecord'),
      src.indexOf('export async function createAdminArtwork')
    );

    expect(createBlock).toContain("revalidatePath('/admin/artworks')");
    expect(createBlock).toContain('schedulePublicArtworkSurfaceRevalidation([artistName])');
    expect(createBlock).not.toContain('revalidatePublicArtworkSurfaces');
  });

  it('exposes a protected internal route for public artwork surface invalidation', () => {
    const src = readFileSync('app/api/internal/revalidate-artwork-surfaces/route.ts', 'utf8');

    expect(src).toContain('validateInternalCronRequest');
    expect(src).toContain('revalidatePublicArtworkSurfaces');
    expect(src).toContain('artistNames');
  });

  it('schedules the protected route instead of calling revalidate directly from the action', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

    expect(src).toContain('function schedulePublicArtworkSurfaceRevalidation');
    expect(src).toContain('/api/internal/revalidate-artwork-surfaces');
    expect(src).toContain('CRON_SECRET');
  });
});
