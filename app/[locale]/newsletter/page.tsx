import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

export const dynamic = 'force-static';
export const revalidate = 60;

interface Props {
  params: Promise<{ locale: string }>;
}

interface NewsletterListItem {
  slug: string;
  issue_no: number;
  title: string;
  preheader: string;
  sent_at: string | null;
}

async function fetchSentNewsletters(): Promise<NewsletterListItem[]> {
  // CI/placeholder 빌드에는 service role key가 없어 throw — graceful 빈 목록 (funding 패턴)
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase
      .from('newsletters')
      .select('slug, issue_no, title, preheader, sent_at')
      .eq('status', 'sent')
      .order('issue_no', { ascending: false });
    return (data ?? []) as NewsletterListItem[];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  return { title: t('title'), description: t('description') };
}

export default async function NewsletterListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'newsletter' });
  const newsletters = await fetchSentNewsletters();
  const dateLocale = locale === 'en' ? 'en-US' : 'ko-KR';

  return (
    <div
      className={`min-h-screen bg-canvas-soft ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <h1 className="text-3xl font-bold text-charcoal-deep">{t('title')}</h1>
        <p className="mt-2 text-charcoal-muted">{t('description')}</p>

        {newsletters.length === 0 ? (
          <p className="mt-12 rounded-lg border border-gallery-hairline bg-white px-4 py-10 text-center text-charcoal-muted">
            {t('empty')}
          </p>
        ) : (
          <ul className="mt-10 space-y-4">
            {newsletters.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/newsletter/${n.slug}`}
                  className="block rounded-lg border border-gallery-hairline bg-white p-6 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
                >
                  <p className="text-eyebrow">
                    {t('issueLabel', { issueNo: n.issue_no })}
                    {n.sent_at && (
                      <>
                        {' · '}
                        {t('publishedOn', {
                          date: new Date(n.sent_at).toLocaleDateString(dateLocale, {
                            timeZone: 'Asia/Seoul',
                            dateStyle: 'long',
                          }),
                        })}
                      </>
                    )}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-charcoal-deep">{n.title}</h2>
                  {n.preheader && <p className="mt-1 text-sm text-charcoal-muted">{n.preheader}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
