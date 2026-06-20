import { readFileSync } from 'node:fs';

describe('admin artwork create revalidate contract', () => {
  it('does not attach public artwork invalidation to the create server action response', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
    const createBlock = src.slice(
      src.indexOf('async function createAdminArtworkRecord'),
      src.indexOf('export async function createAdminArtwork')
    );

    expect(createBlock).toContain("revalidatePath('/admin/artworks')");
    expect(createBlock).toContain('schedulePublicArtworkSurfaceRevalidation([artistName], {');
    expect(createBlock).toContain('artworkId: artwork.id');
    expect(createBlock).toContain('title: artwork.title');
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
    expect(src).toContain('resolvePublicArtworkRevalidationConfig');
  });

  it('reports public artwork revalidation schedule failures to operator-visible channels', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

    expect(src).toContain('resolvePublicArtworkRevalidationConfig');
    expect(src).toContain('logSystemAction');
    expect(src).toContain('notifyEmail');
    expect(src).toContain('public_artwork_revalidation_failed');
  });
});
