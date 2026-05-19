import { getTranslations } from 'next-intl/server';
import { getPosthumousArtistInfo } from '@/lib/posthumous-artist-info';

interface Props {
  artistName: string;
  edition?: string | null;
  editionLimit?: number | null;
  locale: string;
}

export default async function PosthumousPrintDetails({
  artistName,
  edition,
  editionLimit,
  locale,
}: Props) {
  const info = getPosthumousArtistInfo(artistName);
  if (!info) return null;

  const t = await getTranslations({ locale, namespace: 'artworkDetail.posthumous' });
  const isEn = locale === 'en';
  const foundation = isEn ? info.foundationEn : info.foundationKo;

  const rows: { label: string; value: string }[] = [
    { label: t('lifeYearsLabel'), value: `${artistName} (${info.lifeYears})` },
    { label: t('foundationLabel'), value: foundation },
    { label: t('certificateLabel'), value: t('certificateNote') },
  ];

  if (edition && editionLimit) {
    rows.splice(2, 0, {
      label: isEn ? 'Edition' : '에디션',
      value: isEn ? `${edition} of ${editionLimit}` : `${editionLimit}점 한정 중 ${edition}번째`,
    });
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary-surface px-6 py-5">
      <p className="text-xs uppercase tracking-widest text-primary mb-4">
        {isEn ? 'Posthumous Edition' : '사후판화 안내'}
      </p>
      <dl className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3 text-sm">
            <dt className="text-charcoal-muted shrink-0 w-24">{row.label}</dt>
            <dd className="text-charcoal font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-charcoal-muted leading-relaxed">{t('explanation')}</p>
    </div>
  );
}
