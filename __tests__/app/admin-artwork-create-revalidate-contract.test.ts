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
    const routeResponseBlockStart = src.indexOf('if (!response.ok) {');
    const routeResponseBlockEnd = src.indexOf('    } catch (err) {');
    const routeResponseBlock = src.slice(routeResponseBlockStart, routeResponseBlockEnd);

    expect(src).toContain('resolvePublicArtworkRevalidationConfig');
    expect(routeResponseBlockStart).toBeGreaterThanOrEqual(0);
    expect(routeResponseBlock).toContain('notifyEmail');
    expect(routeResponseBlock).toContain('logSystemAction');
    expect(routeResponseBlock).toContain('public_artwork_revalidation_failed');
    expect(routeResponseBlock).toContain("stage: 'route_response'");
  });
});
