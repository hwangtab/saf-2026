import { readFileSync } from 'node:fs';

describe('admin artwork tag action source boundary', () => {
  it('tag actions live in the dedicated action module, not re-exported through admin-artworks', () => {
    // "use server" 파일은 async 함수 외 export(다른 모듈 re-export 포함)를 금지한다. 따라서 태그
    // action은 전용 admin-artwork-tags.ts가 소유하고, admin-artworks.ts는 정의도 re-export도 하지
    // 않으며, 소비 컴포넌트는 전용 모듈에서 직접 import한다. (회귀: re-export 방식은 빌드를 깨뜨림)
    const adminArtworksSource = readFileSync('app/actions/admin-artworks.ts', 'utf8');
    const tagActionSource = readFileSync('app/actions/admin-artwork-tags.ts', 'utf8');

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
      expect(tagActionSource).toContain(`export async function ${actionName}`);
      expect(adminArtworksSource).not.toContain(`export async function ${actionName}`);
    }

    expect(adminArtworksSource).not.toContain("from './admin-artwork-tags'");
    expect(adminArtworksSource).not.toContain("from '@/lib/artworks/admin-tags'");
    expect(adminArtworksSource).not.toContain('createAdminTagMutation');
    expect(adminArtworksSource).not.toContain('deleteAdminTagMutation');
    expect(adminArtworksSource).not.toContain('addAdminTagToArtworksMutation');
  });
});
