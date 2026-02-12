import { requireAdmin } from '@/lib/auth/guards';
import { getActivityLogs } from '@/app/actions/admin-logs';
import { LogsList } from './logs-list';

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
  { value: 'artist_profile_updated', label: '프로필 수정(아티스트)' },
  { value: 'artist_artwork_created', label: '작품 등록(아티스트)' },
  { value: 'artist_artwork_updated', label: '작품 수정(아티스트)' },
  { value: 'artist_artwork_deleted', label: '작품 삭제(아티스트)' },
  { value: 'batch_artwork_status', label: '작품 판매상태 일괄 변경' },
  { value: 'batch_artwork_visibility', label: '작품 숨김 일괄 변경' },
  { value: 'batch_artwork_deleted', label: '작품 일괄 삭제' },
  { value: 'content_created', label: '콘텐츠 생성' },
  { value: 'content_updated', label: '콘텐츠 수정' },
  { value: 'content_deleted', label: '콘텐츠 삭제' },
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
      params.actor_role === 'admin' || params.actor_role === 'artist' ? params.actor_role : 'all',
    action: params.action,
    targetType: params.target_type,
    from: params.from,
    to: params.to,
    reversibleOnly: params.reversible === '1',
  });
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = [
    params.q,
    params.actor_role && params.actor_role !== 'all' ? params.actor_role : undefined,
    params.action,
    params.target_type,
    params.from,
    params.to,
    params.reversible === '1' ? 'reversible' : undefined,
  ].filter(Boolean).length;
  const fieldClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">활동 로그</h1>
        <p className="mt-2 text-sm text-slate-500">
          관리자/아티스트 활동 기록을 조회하고 필요한 경우 복구를 실행합니다.
        </p>
      </div>
      <form className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <input type="hidden" name="page" value="1" />
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">검색/필터</h2>
            <p className="text-xs text-slate-500">조건을 조합해 원하는 로그만 빠르게 확인하세요.</p>
          </div>
          <span className="inline-flex w-fit items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            적용된 필터 {activeFilterCount}개
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            검색어
            <input
              name="q"
              defaultValue={params.q || ''}
              placeholder="이름, 이메일, 대상, 활동"
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            행위자
            <select
              name="actor_role"
              defaultValue={params.actor_role || 'all'}
              className={fieldClass}
            >
              <option value="all">전체 행위자</option>
              <option value="admin">관리자</option>
              <option value="artist">아티스트</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            활동 유형
            <select name="action" defaultValue={params.action || ''} className={fieldClass}>
              {ACTION_FILTER_OPTIONS.map((option) => (
                <option key={option.value || 'all'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            대상
            <select
              name="target_type"
              defaultValue={params.target_type || ''}
              className={fieldClass}
            >
              <option value="">전체 대상</option>
              <option value="artwork">작품</option>
              <option value="artist">작가</option>
              <option value="user">사용자</option>
              <option value="news">뉴스</option>
              <option value="faq">FAQ</option>
              <option value="video">영상</option>
              <option value="testimonial">추천사</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            시작일시
            <input
              name="from"
              type="datetime-local"
              defaultValue={params.from || ''}
              className={fieldClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600">
            종료일시
            <input
              name="to"
              type="datetime-local"
              defaultValue={params.to || ''}
              className={fieldClass}
            />
          </label>
          <label className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 md:col-span-2 xl:col-span-1">
            <input
              type="checkbox"
              name="reversible"
              value="1"
              defaultChecked={params.reversible === '1'}
              className="h-4 w-4 rounded border-slate-300"
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
      <LogsList logs={logs} currentPage={page} totalPages={totalPages} total={total} />
    </div>
  );
}
