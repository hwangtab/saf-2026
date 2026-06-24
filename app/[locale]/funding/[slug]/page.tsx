import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/constants';
import { getTossDomesticClientKey } from '@/lib/integrations/toss/config';
import PageHero from '@/components/ui/PageHero';
import Section from '@/components/ui/Section';
import SafeImage from '@/components/common/SafeImage';
import MarkdownRenderer from '@/components/common/MarkdownRenderer';
import FundingProgressBar from './_components/FundingProgressBar';
import FundingPledgeFlow from './_components/FundingPledgeFlow';

export const dynamic = 'force-static';
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  // CI/placeholder 빌드 환경에는 service role key가 없어 admin client가 throw —
  // graceful 처리(빈 배열)로 빌드 실패 방지. (event 페이지 동일 패턴)
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from('funding_projects').select('slug');
    if (!data) return [];
    return data.flatMap((row) => routing.locales.map((locale) => ({ locale, slug: row.slug })));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  let project: { title: string; summary: string | null; cover_image: string | null } | null = null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('funding_projects')
      .select('title, summary, cover_image')
      .eq('slug', slug)
      .single();
    project = data;
  } catch {
    // CI/placeholder 빌드 환경 — admin client 미설정. 메타데이터는 기본값으로.
  }

  if (!project) return { title: 'Not Found' };

  // OG 이미지는 절대 URL 필수 — 상대경로면 SITE_URL을 붙여 절대화.
  const ogImage = project.cover_image
    ? project.cover_image.startsWith('http')
      ? project.cover_image
      : `${SITE_URL}${project.cover_image}`
    : undefined;

  return {
    title: project.title,
    description: project.summary ?? undefined,
    openGraph: ogImage
      ? {
          images: [{ url: ogImage }],
        }
      : undefined,
  };
}

export default async function FundingPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'funding' });

  // CI/placeholder 빌드 환경에는 service role key가 없어 admin client가 throw —
  // notFound()로 graceful 처리(빌드 시 정적 페이지 생성만 건너뜀). (event 페이지 동일 패턴)
  let supabase: ReturnType<typeof createSupabaseAdminClient>;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    notFound();
  }

  // 프로젝트 상태 — not found 처리
  const { data: statusRaw } = await supabase.rpc('funding_project_status', { p_slug: slug });
  const status = statusRaw as {
    found: boolean;
    goal_amount?: number;
    raised_amount?: number;
    backer_count?: number;
    is_open?: boolean;
    end_at?: string | null;
  } | null;

  if (!status?.found) notFound();

  // 프로젝트 상세
  const { data: project } = await supabase
    .from('funding_projects')
    .select('id, title, summary, story, cover_image, end_at')
    .eq('slug', slug)
    .single();

  if (!project) notFound();

  // 리워드 티어
  const { data: tiers } = await supabase
    .from('reward_tiers')
    .select(
      'id, title, description, amount, total_quantity, requires_shipping, reward_kind, image_url, sort_order'
    )
    .eq('project_id', project.id)
    .order('sort_order');

  // 후원자 명단 (최대 50명)
  const { data: backersRaw } = await supabase.rpc('funding_public_backers', {
    p_slug: slug,
    p_limit: 50,
  });
  const backers =
    (backersRaw as Array<{
      display_name: string;
      amount: number;
      message: string | null;
    }> | null) ?? [];

  // 티어별 잔여 수량
  const { data: remainingRaw } = await supabase.rpc('funding_tier_remaining', { p_slug: slug });
  const remaining = (remainingRaw as Record<string, number | null> | null) ?? {};

  // 진행률 계산
  const goal = status.goal_amount ?? 0;
  const raised = status.raised_amount ?? 0;
  const percent = goal > 0 ? Math.min(Math.floor((raised / goal) * 100), 100) : 0;

  const clientKey = getTossDomesticClientKey();

  return (
    <div>
      <PageHero
        title={project.title}
        description={project.summary ?? undefined}
        customBackgroundImage={project.cover_image ?? undefined}
      />

      <Section>
        <div className="container-max max-w-3xl">
          {/* 진행률 바 — 클라이언트 컴포넌트, 5분마다 폴링 */}
          <FundingProgressBar
            slug={slug}
            initialPercent={percent}
            initialRaised={raised}
            initialBackers={status.backer_count ?? 0}
            endAt={status.end_at ?? null}
          />

          {/* 목표 금액 */}
          <p className="mt-3 text-sm text-charcoal-muted">
            {t('goalLabel')}: {goal.toLocaleString('ko-KR')}원
          </p>

          {/* 커버 이미지 — story 본문과 별개로 큰 이미지 쇼케이스 */}
          {project.cover_image && (
            <div className="mt-8 overflow-hidden rounded-2xl shadow-md">
              <SafeImage
                src={project.cover_image}
                alt={project.title}
                width={896}
                height={504}
                className="w-full object-cover"
                priority
              />
            </div>
          )}

          {/* 스토리 — 마크다운 렌더러 재사용 */}
          {project.story && (
            <article className="mt-10">
              <MarkdownRenderer content={project.story} locale={locale} />
            </article>
          )}

          {/* 후원 플로우 (티어 선택 + 결제) */}
          <FundingPledgeFlow
            slug={slug}
            tiers={tiers ?? []}
            remaining={remaining}
            isOpen={status.is_open ?? false}
            clientKey={clientKey}
          />

          {/* 후원자 명단 */}
          {backers.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold text-charcoal-deep">{t('backerListTitle')}</h2>
              <ul className="mt-4 divide-y divide-gallery-divider">
                {backers.map((b, i) => (
                  <li key={i} className="flex items-start justify-between py-3">
                    <div>
                      <span className="font-medium text-charcoal">{b.display_name}</span>
                      {b.message && (
                        <p className="mt-0.5 text-sm text-charcoal-muted">{b.message}</p>
                      )}
                    </div>
                    <span className="ml-4 shrink-0 text-sm font-semibold text-sun-strong">
                      {b.amount.toLocaleString('ko-KR')}원
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
