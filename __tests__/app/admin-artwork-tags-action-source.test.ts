import { readFileSync } from 'node:fs';

describe('admin artwork tag action source boundary', () => {
  it('re-exports tag actions from the dedicated action module without importing tag mutations locally', () => {
    const adminArtworksSource = readFileSync('app/actions/admin-artworks.ts', 'utf8');

    expect(adminArtworksSource).toContain("from './admin-artwork-tags'");
    for (const actionName of [
      'getAdminTags',
      'getArtworkAdminTags',
      'createAdminTag',
      'updateAdminTag',
      'archiveAdminTag',
      'restoreAdminTag',
      'deleteAdminTag',
      'createAndAttachAdminTagToArtwork',
      'addAdminTagToArtworks',
      'removeAdminTagFromArtworks',
    ]) {
      expect(adminArtworksSource).toContain(actionName);
      expect(adminArtworksSource).not.toContain(`export async function ${actionName}`);
    }

    expect(adminArtworksSource).not.toContain("from '@/lib/artworks/admin-tags'");
    expect(adminArtworksSource).not.toContain('createAdminTagMutation');
    expect(adminArtworksSource).not.toContain('deleteAdminTagMutation');
    expect(adminArtworksSource).not.toContain('addAdminTagToArtworksMutation');
  });
});
