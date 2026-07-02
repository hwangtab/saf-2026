import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { SITE_URL } from '@/lib/constants';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { parseNewsletterBlocks, type NewsletterBlock } from '@/lib/newsletter/blocks';
import { NewsletterBlocksView } from '../_components/NewsletterBlocksView';

export const dynamic = 'force-static';
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

interface NewsletterRow {
  slug: string;
  issue_no: number;
  title: string;
  preheader: string;
  blocks: unknown;
  sent_at: string | null;
}

async function fetchSentNewsletter(slug: string): Promise<NewsletterRow | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('newsletters')
      .select('slug, issue_no, title, preheader, blocks, sent_at')
      .eq('slug', slug)
      .eq('status', 'sent') // sent만 공개 — draft/scheduled는 404
      .maybeSingle();
    return (data as NewsletterRow | null) ?? null;
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from('newsletters').select('slug').eq('status', 'sent');
    if (!data) return [];
    return data.flatMap((row) => routing.locales.map((locale) => ({ locale, slug: row.slug })));
  } catch {
    return [];
  }
}

function firstImageUrl(blocks: NewsletterBlock[]): string | null {
  for (const b of blocks) {
    if (b.type === 'cover' && b.imageUrl) return b.imageUrl;
    if (b.type === 'artworkCard' && b.snapshot.imageUrl) return b.snapshot.imageUrl;
    if (b.type === 'eventBanner' && b.imageUrl) return b.imageUrl;
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const newsletter = await fetchSentNewsletter(slug);
  if (!newsletter) return { title: 'Not Found' };

  let ogImage: string | undefined;
  try {
    ogImage = firstImageUrl(parseNewsletterBlocks(newsletter.blocks)) ?? undefined;
  } catch {
    ogImage = undefined;
  }
  if (ogImage && !ogImage.startsWith('http')) ogImage = `${SITE_URL}${ogImage}`;

  return {
    title: newsletter.title,
    description: newsletter.preheader || undefined,
    openGraph: ogImage ? { images: [{ url: ogImage }] } : undefined,
  };
}

export default async function NewsletterIssuePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });

  const newsletter = await fetchSentNewsletter(slug);
  if (!newsletter) notFound();

  let blocks: NewsletterBlock[];
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    console.error(`[newsletter/${slug}] invalid blocks:`, err);
    notFound();
  }

  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR';

  return (
    <div
      className={`min-h-screen bg-canvas-soft ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <article className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <header className="mb-10 text-center">
          <p className="text-eyebrow">
            {t('issueLabel', { issueNo: newsletter.issue_no })}
            {newsletter.sent_at && (
              <>
                {' · '}
                {t('publishedOn', {
                  date: new Date(newsletter.sent_at).toLocaleDateString(dateLocale, {
                    timeZone: 'Asia/Seoul',
                    dateStyle: 'long',
                  }),
                })}
              </>
            )}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-charcoal-deep md:text-4xl">
            {newsletter.title}
          </h1>
        </header>

        <NewsletterBlocksView blocks={blocks} viewArtworkLabel={t('viewArtwork')} />

        <p className="mt-14 text-center">
          <Link href="/newsletter" className="font-medium text-primary-strong hover:underline">
            ← {t('backToList')}
          </Link>
        </p>
      </article>
    </div>
  );
}
