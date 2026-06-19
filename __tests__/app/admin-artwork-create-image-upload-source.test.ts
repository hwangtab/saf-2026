import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('admin artwork create image upload source wiring', () => {
  const formSource = () => read('app/(portal)/admin/artworks/artwork-edit-form.tsx');
  const imageUploadSource = () => read('components/dashboard/ImageUpload.tsx');
  const imageUploadTypesSource = () => read('components/dashboard/image-upload/types.ts');
  const actionSource = () => read('app/actions/admin-artworks.ts');

  it('shows the artwork image uploader on the new artwork form with a draft prefix', () => {
    const source = formSource();

    expect(source).toContain('const [draftImagePrefix, setDraftImagePrefix] = useState');
    expect(source).toContain('admin-artwork-draft-${crypto.randomUUID()}');
    expect(source).toContain('<AdminCard id="artwork-images"');
    expect(source).not.toContain('이미지 등록은 작품 정보를 먼저 저장한 후에 가능합니다.');
  });

  it('submits uploaded draft image URLs with the create form', () => {
    const source = formSource();

    expect(source).toContain('name="images" value={JSON.stringify(images)}');
    expect(source).toContain('name="image_owner_prefix" value={draftImagePrefix}');
    expect(source).toContain('deleteOnRemove={!isEditing}');
    expect(source).toContain('if (!artwork.id) return;');
  });

  it('blocks new artwork submission while image upload is in progress', () => {
    const source = formSource();

    expect(source).toContain('const [uploadingImages, setUploadingImages] = useState(false)');
    expect(source).toContain('if (!isEditing && uploadingImages)');
    expect(source).toContain('이미지 업로드 중입니다. 완료 후 등록해주세요.');
    expect(source).toContain('onUploadingChange={setUploadingImages}');
    expect(source).toContain('disabled={!isEditing && (uploadingImages || !draftImagePrefix)}');
  });

  it('exposes ImageUpload uploading state to parent forms', () => {
    const source = imageUploadSource();
    const typesSource = imageUploadTypesSource();

    expect(typesSource).toContain('onUploadingChange?: (uploading: boolean) => void;');
    expect(source).toContain('onUploadingChange,');
    expect(source).toContain('onUploadingChange?.(uploading)');
    expect(source).toContain('[onUploadingChange, uploading]');
  });

  it('keeps existing edit-mode image saves and edit save navigation intact', () => {
    const source = formSource();

    expect(source).toContain('updateArtworkImages(artwork.id, newImages)');
    expect(source).toContain("router.push('/admin/artworks');");
  });

  it('routes newly created artwork back to the list after create succeeds', () => {
    const source = formSource();

    expect(source).toContain("router.push('/admin/artworks')");
    expect(source).toContain("throw new Error('작품 등록 결과가 올바르지 않습니다.');");
  });

  it('uses a real link for the back-to-list button', () => {
    const source = formSource();

    expect(source).toContain('<Button href="/admin/artworks" variant="white">');
    expect(source).not.toContain(
      '<Button type="button" variant="white" onClick={() => router.push(\'/admin/artworks\')}>'
    );
  });

  it('validates draft image URLs before inserting a new admin artwork', () => {
    const source = actionSource();

    expect(source).toContain('const ADMIN_ARTWORK_MAX_IMAGES = 10;');
    expect(source).toContain("parseUrlList(formData.get('images'), '이미지')");
    expect(source).toContain("imageOwnerPrefix.startsWith('admin-artwork-draft-')");
    expect(source).toContain('validateImageUrls(imageList.urls, imageOwnerPrefix)');
    expect(source).toContain('images: imageList.urls');
  });
});
