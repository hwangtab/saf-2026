import { requireAdmin } from '@/lib/auth/guards';
import {
  getSocialConfigStatus,
  getSocialTokenStatuses,
  listPublishCandidates,
  listSocialPosts,
} from '@/app/actions/admin-social';
import { getActiveShowingItems } from '@/lib/now-showing';
import { MASTER_ARTISTS } from '@/lib/master-artists';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { SocialPublisher } from './_components/SocialPublisher';
import { SocialPostList } from './_components/SocialPostList';
import { SocialTokenStatusPanel } from './_components/SocialTokenStatus';

export const metadata = {
  title: '소셜 미디어 | 관리자',
};

/** 진행 중 특별전(/special/*)의 거장 작가 한글명 — 후보 필터 칩용. */
function getActiveShowingArtistNames(): string[] {
  return getActiveShowingItems()
    .map((item) => item.href)
    .filter((href): href is string => href != null && href.startsWith('/special/'))
    .map((href) => href.replace('/special/', ''))
    .map((slug) => MASTER_ARTISTS.find((m) => m.specialSlug === slug)?.artistName)
    .filter((name): name is string => Boolean(name));
}

export default async function AdminSocialPage() {
  await requireAdmin();
  const [configStatus, candidates, posts, tokenStatuses] = await Promise.all([
    getSocialConfigStatus(),
    listPublishCandidates(),
    listSocialPosts(),
    getSocialTokenStatuses(),
  ]);
  const showingArtistNames = getActiveShowingArtistNames();

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>소셜 미디어</AdminPageTitle>
        <AdminPageDescription>
          게시 후보에서 작품을 고르거나 직접 검색해 Instagram·Threads에 게시합니다. 캡션 초안은
          자동으로 채워지며 게시 전 자유롭게 편집할 수 있습니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <SocialTokenStatusPanel statuses={tokenStatuses} />

      <SocialPublisher
        candidates={candidates}
        showingArtistNames={showingArtistNames}
        configStatus={configStatus}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">게시 이력</h2>
        <SocialPostList initial={posts} />
      </section>
    </div>
  );
}
