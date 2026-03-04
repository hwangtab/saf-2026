import { requireAdmin } from '@/lib/auth/guards';
import { getActivityLogs } from '@/app/actions/admin-logs';
import { LogsList } from './logs-list';
import { Cafe24SyncLogCleanupButton } from './cafe24-sync-log-cleanup-button';
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';

const ACTION_FILTER_OPTIONS = [
  { value: '', label: '전체 활동' },
  { value: 'user_approved', label: '사용자 승인' },
  { value: 'user_rejected', label: '사용자 거절' },
  { value: 'user_reactivated', label: '사용자 재활성화' },
  { value: 'user_role_changed', label: '사용자 권한 변경' },
  { value: 'artwork_created', label: '작품 등록(관리자)' },
  { value: 'artwork_updated', label: '작품 수정(관리자)' },
  { value: 'artwork_deleted', label: '작품 삭제(관리자)' },
  { value: 'artwork_images_updated', label: '작품 이미지 변경(관리자)' },
  { value: 'artist_created', label: '작가 등록(관리자)' },
  { value: 'artist_updated', label: '작가 수정(관리자)' },
  { value: 'artist_deleted', label: '작가 삭제(관리자)' },
  { value: 'artist_linked_to_user', label: '작가-사용자 계정 연결(관리자)' },
  { value: 'artist_unlinked_from_user', label: '작가-사용자 계정 연결 해제(관리자)' },
  { value: 'artist_profile_image_updated', label: '작가 프로필 이미지 변경' },
  { value: 'artist_profile_updated', label: '프로필 수정(아티스트)' },
  { value: 'artist_artwork_created', label: '작품 등록(아티스트)' },
  { value: 'artist_artwork_updated', label: '작품 수정(아티스트)' },
  { value: 'artist_artwork_deleted', label: '작품 삭제(아티스트)' },
  { value: 'artist_application_submitted', label: '아티스트 신청서 제출' },
  { value: 'exhibitor_application_submitted', label: '출품자 신청서 제출' },
  { value: 'exhibitor_artist_created', label: '작가 등록(출품자)' },
  { value: 'exhibitor_artist_updated', label: '작가 수정(출품자)' },
  { value: 'exhibitor_artist_deleted', label: '작가 삭제(출품자)' },
  { value: 'exhibitor_artwork_created', label: '작품 등록(출품자)' },
  { value: 'exhibitor_artwork_updated', label: '작품 수정(출품자)' },
  { value: 'exhibitor_artwork_deleted', label: '작품 삭제(출품자)' },
  { value: 'batch_artwork_status', label: '작품 판매상태 일괄 변경' },
  { value: 'batch_artwork_visibility', label: '작품 숨김 일괄 변경' },
  { value: 'batch_artwork_deleted', label: '작품 일괄 삭제' },
  { value: 'artworks_exported', label: '작품 데이터 다운로드' },
  { value: 'artist_contacts_exported', label: '작가 연락처 다운로드' },
  { value: 'content_created', label: '콘텐츠 생성' },
  { value: 'content_updated', label: '콘텐츠 수정' },
  { value: 'content_deleted', label: '콘텐츠 삭제' },
  { value: 'news_created', label: '뉴스 생성' },
  { value: 'news_updated', label: '뉴스 수정' },
  { value: 'news_deleted', label: '뉴스 삭제' },
  { value: 'faq_created', label: 'FAQ 생성' },
  { value: 'faq_updated', label: 'FAQ 수정' },
  { value: 'faq_deleted', label: 'FAQ 삭제' },
  { value: 'video_created', label: '영상 생성' },
  { value: 'video_updated', label: '영상 수정' },
  { value: 'video_deleted', label: '영상 삭제' },
  { value: 'testimonial_updated', label: '추천사 수정' },
  { value: 'cafe24_sales_sync_warning', label: 'Cafe24 판매 동기화 경고' },
  { value: 'cafe24_sales_sync_failed', label: 'Cafe24 판매 동기화 실패' },
  { value: 'trash_purged', label: '휴지통 영구 삭제' },
  { value: 'revert_executed', label: '복구 실행' },
] as const;

type Props = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    actor_role?: string;
    action?: string;
    target_type?: string;
    from?: string;
    to?: string;
    reversible?: string;
  }>;
};

export default async function AdminLogsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const limit = 50;

  const { logs, total } = await getActivityLogs({
    page,
    limit,
    q: params.q,
    actorRole:
      params.actor_role === 'human' ||
      params.actor_role === 'admin' ||
      params.actor_role === 'artist' ||
      params.actor_role === 'exhibitor' ||
      params.actor_role === 'system' ||
      params.actor_role === 'all'
        ? params.actor_role
        : 'human',
    action: params.action,
    targetType: params.target_type,
    from: params.from,
    to: params.to,
    reversibleOnly: params.reversible === '1',
  });
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = [
    params.q,
    params.actor_role && params.actor_role !== 'human' ? params.actor_role : undefined,
    params.action,
    params.target_type,
    params.from,
    params.to,
    params.reversible === '1' ? 'reversible' : undefined,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>활동 로그</AdminPageTitle>
        <AdminPageDescription>
          관리자/아티스트 활동 기록을 조회하고 필요한 경우 복구를 실행합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <AdminCard className="overflow-hidden">
        <form>
          <input type="hidden" name="page" value="1" />
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">검색/필터</h2>
              <p className="text-xs text-slate-500">
                조건을 조합해 원하는 로그만 빠르게 확인하세요.
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <AdminBadge className="bg-white text-slate-700 ring-slate-200">
                적용된 필터 {activeFilterCount}개
              </AdminBadge>
              <Cafe24SyncLogCleanupButton />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              검색어
              <AdminInput
                name="q"
                defaultValue={params.q || ''}
                placeholder="이름, 이메일, 대상, 활동"
                className="h-10"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              행위자
              <AdminSelect
                name="actor_role"
                defaultValue={params.actor_role || 'human'}
                className="h-10"
              >
                <option value="human">운영 사용자만</option>
                <option value="admin">관리자</option>
                <option value="artist">아티스트</option>
                <option value="exhibitor">출품자</option>
                <option value="system">시스템</option>
                <option value="all">전체 행위자</option>
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              활동 유형
              <AdminSelect name="action" defaultValue={params.action || ''} className="h-10">
                {ACTION_FILTER_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              대상
              <AdminSelect
                name="target_type"
                defaultValue={params.target_type || ''}
                className="h-10"
              >
                <option value="">전체 대상</option>
                <option value="artwork">작품</option>
                <option value="artist">작가</option>
                <option value="user">사용자</option>
                <option value="news">뉴스</option>
                <option value="faq">FAQ</option>
                <option value="video">영상</option>
                <option value="testimonial">추천사</option>
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              시작일시
              <AdminInput
                name="from"
                type="datetime-local"
                defaultValue={params.from || ''}
                className="h-10"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
              종료일시
              <AdminInput
                name="to"
                type="datetime-local"
                defaultValue={params.to || ''}
                className="h-10"
              />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                name="reversible"
                value="1"
                defaultChecked={params.reversible === '1'}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              복구 가능한 로그만 보기
            </label>
            <div className="flex items-center justify-end gap-2 md:col-span-2 xl:col-span-1">
              <a
                href="/admin/logs"
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                초기화
              </a>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                필터 적용
              </button>
            </div>
          </div>
        </form>
      </AdminCard>
      <LogsList logs={logs} currentPage={page} totalPages={totalPages} total={total} />
    </div>
  );
}
