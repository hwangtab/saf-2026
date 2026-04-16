import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guards';
import { getActivityLogs } from '@/app/actions/admin-logs';
import { LogsList } from './logs-list';
import {
  AdminBadge,
  AdminCard,
  AdminInput,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

const ACTION_FILTER_OPTIONS_KO = [
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
  { value: 'order_deposit_confirmed', label: '주문 입금 확인' },
  { value: 'order_awaiting_cancelled', label: '입금대기 주문 취소' },
  { value: 'order_status_updated', label: '주문 상태 변경' },
  { value: 'order_tracking_updated', label: '운송장 정보 수정' },
  { value: 'order_refunded', label: '주문 환불' },
  { value: 'trash_purged', label: '휴지통 영구 삭제' },
  { value: 'revert_executed', label: '복구 실행' },
] as const;

const ACTION_FILTER_OPTIONS_EN = [
  { value: '', label: 'All actions' },
  { value: 'user_approved', label: 'User approved' },
  { value: 'user_rejected', label: 'User rejected' },
  { value: 'user_reactivated', label: 'User reactivated' },
  { value: 'user_role_changed', label: 'User role changed' },
  { value: 'artwork_created', label: 'Artwork created (admin)' },
  { value: 'artwork_updated', label: 'Artwork updated (admin)' },
  { value: 'artwork_deleted', label: 'Artwork deleted (admin)' },
  { value: 'artwork_images_updated', label: 'Artwork images updated (admin)' },
  { value: 'artist_created', label: 'Artist created (admin)' },
  { value: 'artist_updated', label: 'Artist updated (admin)' },
  { value: 'artist_deleted', label: 'Artist deleted (admin)' },
  { value: 'artist_linked_to_user', label: 'Artist linked to user (admin)' },
  { value: 'artist_unlinked_from_user', label: 'Artist unlinked from user (admin)' },
  { value: 'artist_profile_image_updated', label: 'Artist profile image updated' },
  { value: 'artist_profile_updated', label: 'Profile updated (artist)' },
  { value: 'artist_artwork_created', label: 'Artwork created (artist)' },
  { value: 'artist_artwork_updated', label: 'Artwork updated (artist)' },
  { value: 'artist_artwork_deleted', label: 'Artwork deleted (artist)' },
  { value: 'artist_application_submitted', label: 'Artist application submitted' },
  { value: 'exhibitor_application_submitted', label: 'Exhibitor application submitted' },
  { value: 'exhibitor_artist_created', label: 'Artist created (exhibitor)' },
  { value: 'exhibitor_artist_updated', label: 'Artist updated (exhibitor)' },
  { value: 'exhibitor_artist_deleted', label: 'Artist deleted (exhibitor)' },
  { value: 'exhibitor_artwork_created', label: 'Artwork created (exhibitor)' },
  { value: 'exhibitor_artwork_updated', label: 'Artwork updated (exhibitor)' },
  { value: 'exhibitor_artwork_deleted', label: 'Artwork deleted (exhibitor)' },
  { value: 'batch_artwork_status', label: 'Batch artwork status changed' },
  { value: 'batch_artwork_visibility', label: 'Batch artwork visibility changed' },
  { value: 'batch_artwork_deleted', label: 'Batch artwork deleted' },
  { value: 'artworks_exported', label: 'Artwork data exported' },
  { value: 'artist_contacts_exported', label: 'Artist contacts exported' },
  { value: 'content_created', label: 'Content created' },
  { value: 'content_updated', label: 'Content updated' },
  { value: 'content_deleted', label: 'Content deleted' },
  { value: 'news_created', label: 'News created' },
  { value: 'news_updated', label: 'News updated' },
  { value: 'news_deleted', label: 'News deleted' },
  { value: 'faq_created', label: 'FAQ created' },
  { value: 'faq_updated', label: 'FAQ updated' },
  { value: 'faq_deleted', label: 'FAQ deleted' },
  { value: 'video_created', label: 'Video created' },
  { value: 'video_updated', label: 'Video updated' },
  { value: 'video_deleted', label: 'Video deleted' },
  { value: 'testimonial_updated', label: 'Testimonial updated' },
  { value: 'order_deposit_confirmed', label: 'Order deposit confirmed' },
  { value: 'order_awaiting_cancelled', label: 'Awaiting-deposit order cancelled' },
  { value: 'order_status_updated', label: 'Order status changed' },
  { value: 'order_tracking_updated', label: 'Tracking info updated' },
  { value: 'order_refunded', label: 'Order refunded' },
  { value: 'trash_purged', label: 'Trash purged' },
  { value: 'revert_executed', label: 'Revert executed' },
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
  const locale = await getServerLocale();
  const isEnglish = locale === 'en';
  const actionFilterOptions = isEnglish ? ACTION_FILTER_OPTIONS_EN : ACTION_FILTER_OPTIONS_KO;
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
        <AdminPageTitle>{isEnglish ? 'Activity Logs' : '활동 로그'}</AdminPageTitle>
        <AdminPageDescription>
          {isEnglish
            ? 'Review admin/artist activity records and execute revert actions when needed.'
            : '관리자/아티스트 활동 기록을 조회하고 필요한 경우 복구를 실행합니다.'}
        </AdminPageDescription>
      </AdminPageHeader>
      <AdminCard className="overflow-hidden">
        <form>
          <input type="hidden" name="page" value="1" />
          <div className="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {isEnglish ? 'Search / Filters' : '검색/필터'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEnglish
                  ? 'Combine filters to quickly find the logs you need.'
                  : '조건을 조합해 원하는 로그만 빠르게 확인하세요.'}
              </p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <AdminBadge className="bg-white text-gray-700 ring-gray-200">
                {isEnglish
                  ? `Applied filters ${activeFilterCount}`
                  : `적용된 필터 ${activeFilterCount}개`}
              </AdminBadge>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'Keyword' : '검색어'}
              <AdminInput
                name="q"
                defaultValue={params.q || ''}
                placeholder={isEnglish ? 'Name, email, target, action' : '이름, 이메일, 대상, 활동'}
                className="h-10"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'Actor' : '행위자'}
              <AdminSelect
                name="actor_role"
                defaultValue={params.actor_role || 'human'}
                className="h-10"
              >
                <option value="human">
                  {isEnglish ? 'Human operators only' : '운영 사용자만'}
                </option>
                <option value="admin">{isEnglish ? 'Admin' : '관리자'}</option>
                <option value="artist">{isEnglish ? 'Artist' : '아티스트'}</option>
                <option value="exhibitor">{isEnglish ? 'Exhibitor' : '출품자'}</option>
                <option value="system">{isEnglish ? 'System' : '시스템'}</option>
                <option value="all">{isEnglish ? 'All actors' : '전체 행위자'}</option>
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'Action type' : '활동 유형'}
              <AdminSelect name="action" defaultValue={params.action || ''} className="h-10">
                {actionFilterOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'Target' : '대상'}
              <AdminSelect
                name="target_type"
                defaultValue={params.target_type || ''}
                className="h-10"
              >
                <option value="">{isEnglish ? 'All targets' : '전체 대상'}</option>
                <option value="order">{isEnglish ? 'Order' : '주문'}</option>
                <option value="artwork">{isEnglish ? 'Artwork' : '작품'}</option>
                <option value="artist">{isEnglish ? 'Artist' : '작가'}</option>
                <option value="user">{isEnglish ? 'User' : '사용자'}</option>
                <option value="news">{isEnglish ? 'News' : '뉴스'}</option>
                <option value="faq">FAQ</option>
                <option value="video">{isEnglish ? 'Video' : '영상'}</option>
                <option value="testimonial">{isEnglish ? 'Testimonial' : '추천사'}</option>
              </AdminSelect>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'Start date/time' : '시작일시'}
              <AdminInput
                name="from"
                type="datetime-local"
                defaultValue={params.from || ''}
                className="h-10"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
              {isEnglish ? 'End date/time' : '종료일시'}
              <AdminInput
                name="to"
                type="datetime-local"
                defaultValue={params.to || ''}
                className="h-10"
              />
            </label>
            <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 md:col-span-2 xl:col-span-1">
              <input
                type="checkbox"
                name="reversible"
                value="1"
                defaultChecked={params.reversible === '1'}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              {isEnglish ? 'Only show reversible logs' : '복구 가능한 로그만 보기'}
            </label>
            <div className="flex items-center justify-end gap-2 md:col-span-2 xl:col-span-1">
              <Link
                href="/admin/logs"
                className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {isEnglish ? 'Reset' : '초기화'}
              </Link>
              <button
                type="submit"
                className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {isEnglish ? 'Apply filters' : '필터 적용'}
              </button>
            </div>
          </div>
        </form>
      </AdminCard>
      <LogsList logs={logs} currentPage={page} totalPages={totalPages} total={total} />
    </div>
  );
}
