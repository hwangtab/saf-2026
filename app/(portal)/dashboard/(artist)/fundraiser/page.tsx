import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('dashboard.fundraiser');

  if (!OH_YOON_TERRACOTTA_EXHIBITION.active) {
    return (
      <div className="space-y-4">
        <AdminPageHeader>
          <AdminPageTitle>{t('title')}</AdminPageTitle>
          <AdminPageDescription>{t('closedNotice')}</AdminPageDescription>
        </AdminPageHeader>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: artworks } = await supabase
    .from('artworks')
    .select(
      'id, title, images, price, status, manual_sold_override, exhibition, is_hidden, created_at'
    )
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      {/* 스토리 헤더 — 기존 오윤 콘텐츠 재사용·요약 + 청원 링크 */}
      <section className="rounded-2xl border border-gallery-hairline bg-canvas-strong p-6">
        <p className="text-eyebrow">{t('title')}</p>
        <h1 className="mt-2 text-2xl font-bold text-charcoal-deep">{t('storyHeading')}</h1>
        <p className="mt-3 text-charcoal-muted leading-relaxed">{t('storyBody')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <LinkButton href={OH_YOON_TERRACOTTA_EXHIBITION.petitionHref} variant="secondary">
            {t('petitionLink')}
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
          isHidden: a.is_hidden === true,
        }))}
        maxPerArtist={OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist}
      />
    </div>
  );
}
