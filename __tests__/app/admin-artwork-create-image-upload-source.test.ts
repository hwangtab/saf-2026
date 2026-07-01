import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('admin artwork create image upload source wiring', () => {
  const formSource = () => read('app/(portal)/admin/artworks/artwork-edit-form.tsx');
  const imageUploadSource = () => read('components/dashboard/ImageUpload.tsx');
  const imageUploadTypesSource = () => read('components/dashboard/image-upload/types.ts');
  const adminArtworksSource = () => read('app/actions/admin-artworks.ts');
  const detailsActionSource = () => read('app/actions/admin-artwork-details.ts');
  const detailsFormSource = () => read('lib/artworks/details-form.ts');
  const detailsMutationsSource = () => read('lib/artworks/details-mutations.ts');

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
    expect(source).toContain('이미지 업로드 중입니다. 완료 후 등록해 주세요.');
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

  it('routes newly created artwork back to the list via a hard navigation', () => {
    const source = formSource();
    const adminArtworksAction = adminArtworksSource();
    const detailsAction = detailsActionSource();

    // 회귀(2026-06-19, navigation 코드만 5회 수정·전부 실패): 작품 등록 시 server action은
    // 매번 정상 완주(POST 200, INSERT·로그 성공)했으나 응답에 실린 무거운 캐시 무효화 처리 중
    // client React router가 멈춰 화면이 굳고 토스트·"목록으로" 링크까지 막혔다. router.push·
    // redirect() 같은 React router 경로는 모두 같은 지점에서 막힌다. 등록 후 이동은 React
    // router를 우회한 하드 내비게이션(window.location.assign)으로 강제해 교착을 구조적으로
    // 회피하고, 액션의 무거운 공개면 revalidate(revalidateTag('artworks'))는 등록 경로에서 제거.
    expect(source).toContain('createAdminArtwork(formData)');
    expect(source).toContain("window.location.assign('/admin/artworks')");
    // "use server" re-export 금지 — 폼은 전용 details action 모듈에서 직접 import하고,
    // admin-artworks.ts는 createAdminArtwork를 더 이상 정의도 re-export도 하지 않는다.
    expect(source).toContain("from '@/app/actions/admin-artwork-details'");
    expect(adminArtworksAction).not.toContain('createAdminArtwork');
    expect(detailsAction).toContain('export async function createAdminArtwork(formData: FormData)');

    // 같은 회귀를 되살릴 수 있는 옛 패턴이 다시 들어오지 못하게 한다.
    expect(source).not.toContain('createAdminArtworkAndRedirect');
    expect(source).not.toContain('unstable_rethrow');
    expect(detailsAction).not.toContain('createAdminArtworkAndRedirect');
  });

  it('uses a portal-safe Next link for the back-to-list button', () => {
    const source = formSource();

    expect(source).toContain('import Link from');
    expect(source).toContain(
      '<Link href="/admin/artworks" className={buttonVariants({ variant: \'white\' })}>'
    );
    expect(source).not.toContain('<Button href="/admin/artworks"');
    expect(source).not.toContain(
      '<Button type="button" variant="white" onClick={() => router.push(\'/admin/artworks\')}>'
    );
  });

  it('validates draft image URLs before inserting a new admin artwork', () => {
    const action = detailsActionSource();
    const detailsForm = detailsFormSource();
    const detailsMutations = detailsMutationsSource();

    expect(detailsForm).toContain('export const ADMIN_ARTWORK_MAX_IMAGES = 10;');
    expect(detailsForm).toContain("parseUrlList(formData.get('images'), '이미지')");
    expect(detailsForm).toContain("imageOwnerPrefix.startsWith('admin-artwork-draft-')");
    expect(detailsForm).toContain('validateImageUrls(imageList.urls, imageOwnerPrefix)');
    expect(detailsForm).toContain('images: imageList.urls');
    expect(action).toContain('async function createAdminArtworkRecord(formData: FormData)');
    expect(action).toContain('parseAdminArtworkCreateFormData(formData)');
    expect(action).toContain('createAdminArtworkRecordMutation(supabase, { details })');
    expect(detailsMutations).toContain('buildAdminArtworkCreateInsert(details)');
  });

  it('schedules public artwork cache invalidation after create without blocking the action response', () => {
    const action = detailsActionSource();

    expect(action).toContain('schedulePublicArtworkSurfaceRevalidation([artistName], {');
    expect(action).toContain('artworkId: artwork.id');
    expect(action).toContain('title: artwork.title');
    expect(action).toContain('/api/internal/revalidate-artwork-surfaces');
    expect(action).toContain("revalidatePath('/admin/artworks')");
    expect(action).not.toContain('신규 작품의 공개면 노출은 다음 자연 revalidate');
  });
});
