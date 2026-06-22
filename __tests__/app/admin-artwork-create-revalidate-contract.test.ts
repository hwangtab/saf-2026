import { readFileSync } from 'node:fs';

function functionBlock(src: string, name: string) {
  const start = src.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = src.indexOf('\nexport async function ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

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

  it.each(['recordArtworkSale', 'updateArtworkSale', 'voidArtworkSale'])(
    '%s는 상태 동기화 후 공개 상세/목록을 무효화한다',
    (name) => {
      const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
      const block = functionBlock(src, name);
      const deriveIndex = block.indexOf('await deriveAndSyncArtworkStatus');
      const detailRevalidateIndex = block.lastIndexOf('revalidatePublicArtworkDetails');

      expect(deriveIndex).toBeGreaterThanOrEqual(0);
      expect(detailRevalidateIndex).toBeGreaterThanOrEqual(0);
      expect(deriveIndex).toBeLessThan(detailRevalidateIndex);
      expect(block).toContain('revalidatePublicArtworkSurfaces');
    }
  );

  it.each(['updateArtworkImages', 'updateArtworkCategory'])(
    '%s는 공개 상세 KO/EN을 helper로 무효화한다',
    (name) => {
      const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
      const block = functionBlock(src, name);

      expect(block).toContain('revalidatePublicArtworkDetails([id])');
    }
  );

  it('batchUpdateArtworkStatus는 변경된 작품 상세 KO/EN을 helper로 무효화한다', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
    const block = functionBlock(src, 'batchUpdateArtworkStatus');

    expect(block).toContain('revalidatePublicArtworkDetails(ids)');
  });

  it('artist artwork update는 공개 상세 KO/EN을 helper로 무효화한다', () => {
    const src = readFileSync('app/actions/artwork.ts', 'utf8');
    const block = functionBlock(src, 'updateArtwork');

    expect(block).toContain('revalidatePublicArtworkDetails([id])');
  });
});
