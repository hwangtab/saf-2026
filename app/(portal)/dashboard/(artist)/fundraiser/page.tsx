import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import { FundraiserSelection } from './fundraiser-selection';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import LinkButton from '@/components/ui/LinkButton';

export default async function FundraiserPage() {
  const { artist } = await getArtistDashboardContext();

  if (!OH_YOON_TERRACOTTA_EXHIBITION.active) {
    return (
      <div className="space-y-4">
        <AdminPageHeader>
          <AdminPageTitle>{OH_YOON_TERRACOTTA_EXHIBITION.labelKo}</AdminPageTitle>
          <AdminPageDescription>기금마련전 출품 접수가 종료되었습니다.</AdminPageDescription>
        </AdminPageHeader>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, images, price, status, manual_sold_override, exhibition, created_at')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* 스토리 헤더 — 기존 오윤 콘텐츠 재사용·요약 + 청원 링크 */}
      <section className="rounded-2xl border border-gallery-hairline bg-canvas-strong p-6">
        <p className="text-eyebrow">{OH_YOON_TERRACOTTA_EXHIBITION.labelKo}</p>
        <h1 className="mt-2 text-2xl font-bold text-charcoal-deep">
          동료 작가들의 연대로 오윤 테라코타를 지킵니다
        </h1>
        <p className="mt-3 text-charcoal-muted leading-relaxed">
          1974년 옛 상업은행 구의동지점에 새겨진 오윤의 테라코타 양면 부조가 멸실 위기에 놓였습니다.
          작가들이 자기 작품을 내놓아, 판매 수익을 오윤 테라코타 이전 기금으로 잇습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            벽화 지키기 청원 보기
          </LinkButton>
        </div>
      </section>

      <FundraiserSelection
        artworks={(artworks ?? []).map((a) => ({
          id: a.id,
          title: a.title,
          image: a.images?.[0] ?? null,
          price: a.price,
          isTagged: a.exhibition === OH_YOON_TERRACOTTA_EXHIBITION.slug,
          isSold: a.status === 'sold' || a.manual_sold_override === true,
        }))}
        maxPerArtist={OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}
      />
    </div>
  );
}
