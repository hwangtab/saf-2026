import { readFileSync } from 'node:fs';

function functionBlock(src: string, name: string) {
  const start = src.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = src.indexOf('\nexport async function ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

describe('admin artwork create revalidate contract', () => {
  it('does not attach public artwork invalidation to the create server action response', () => {
    const src = readFileSync('app/actions/admin-artwork-details.ts', 'utf8');
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
    const src = readFileSync('app/actions/admin-artwork-details.ts', 'utf8');

    expect(src).toContain('function schedulePublicArtworkSurfaceRevalidation');
    expect(src).toContain('/api/internal/revalidate-artwork-surfaces');
    expect(src).toContain('resolvePublicArtworkRevalidationConfig');
  });

  it('reports public artwork revalidation schedule failures to operator-visible channels', () => {
    const src = readFileSync('app/actions/admin-artwork-details.ts', 'utf8');
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

  it('admin-artworks re-exports details actions without importing details orchestration locally', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

    expect(src).toContain("from './admin-artwork-details'");
    for (const actionName of ['createAdminArtwork', 'updateArtworkDetails']) {
      expect(src).toContain(actionName);
      expect(src).not.toContain(`export async function ${actionName}`);
    }

    expect(src).not.toContain("from '@/lib/artworks/details-form'");
    expect(src).not.toContain("from '@/lib/artworks/details-mutations'");
    expect(src).not.toContain("from '@/lib/admin/public-artwork-revalidation'");
    expect(src).not.toContain("from 'next/server'");
    expect(src).not.toContain('schedulePublicArtworkSurfaceRevalidation');
    expect(src).not.toContain('createAdminArtworkRecordMutation');
    expect(src).not.toContain('updateAdminArtworkDetailsMutation');
  });

  it.each(['recordArtworkSale', 'updateArtworkSale', 'voidArtworkSale'])(
    '%s는 domain mutation 후 공개 상세/목록을 무효화한다',
    (name) => {
      const src = readFileSync('app/actions/admin-artwork-sales.ts', 'utf8');
      const block = functionBlock(src, name);
      const domainCallIndex = Math.max(
        block.indexOf('recordManualArtworkSale('),
        block.indexOf('updateManualArtworkSale('),
        block.indexOf('voidManualArtworkSale(')
      );
      const detailRevalidateIndex = block.lastIndexOf('revalidatePublicArtworkDetails');

      expect(domainCallIndex).toBeGreaterThanOrEqual(0);
      expect(detailRevalidateIndex).toBeGreaterThanOrEqual(0);
      expect(domainCallIndex).toBeLessThan(detailRevalidateIndex);
      expect(block).toContain('revalidatePublicArtworkSurfaces');
    }
  );

  it('판매 기록 action은 artwork sales domain module을 사용한다', () => {
    const src = readFileSync('app/actions/admin-artwork-sales.ts', 'utf8');
    const recordBlock = functionBlock(src, 'recordArtworkSale');
    const updateBlock = functionBlock(src, 'updateArtworkSale');
    const voidBlock = functionBlock(src, 'voidArtworkSale');

    expect(recordBlock).toContain('recordManualArtworkSale(');
    expect(updateBlock).toContain('updateManualArtworkSale(');
    expect(voidBlock).toContain('voidManualArtworkSale(');
    expect(recordBlock).not.toContain(".from('artwork_sales').insert");
    expect(updateBlock).not.toContain(".from('artwork_sales')");
    expect(voidBlock).not.toContain(".from('artwork_sales')");
  });

  it('admin-artworks re-exports sales actions without importing sales orchestration locally', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

    expect(src).toContain("from './admin-artwork-sales'");
    for (const actionName of [
      'getArtworkSales',
      'recordArtworkSale',
      'updateArtworkSale',
      'voidArtworkSale',
    ]) {
      expect(src).toContain(actionName);
      expect(src).not.toContain(`export async function ${actionName}`);
    }

    expect(src).not.toContain("from '@/lib/artworks/sales'");
    expect(src).not.toContain("from '@/lib/actions/artwork-validation'");
    expect(src).not.toContain('recordManualArtworkSale');
    expect(src).not.toContain('updateManualArtworkSale');
    expect(src).not.toContain('voidManualArtworkSale');
  });

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
