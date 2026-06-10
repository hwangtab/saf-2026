import { requireAdmin } from '@/lib/auth/guards';
import { getSocialConfigStatus, listSocialPosts } from '@/app/actions/admin-social';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { SocialComposer } from './_components/SocialComposer';
import { SocialPostList } from './_components/SocialPostList';

export const metadata = {
  title: '소셜 미디어 | 관리자',
};

export default async function AdminSocialPage() {
  await requireAdmin();
  const [configStatus, posts] = await Promise.all([getSocialConfigStatus(), listSocialPosts()]);

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>소셜 미디어</AdminPageTitle>
        <AdminPageDescription>
          작품을 선택해 Instagram·Threads에 게시합니다. 캡션 초안은 자동으로 채워지며 게시 전
          자유롭게 편집할 수 있습니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <SocialComposer configStatus={configStatus} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">게시 이력</h2>
        <SocialPostList initial={posts} />
      </section>
    </div>
  );
}
