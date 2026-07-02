import SafeImage from '@/components/common/SafeImage';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

interface Props {
  blocks: NewsletterBlock[];
  viewArtworkLabel: string; // i18n 라벨은 페이지에서 주입 (이 컴포넌트는 순수 렌더)
}

export function NewsletterBlocksView({ blocks, viewArtworkLabel }: Props) {
  return (
    <div className="space-y-10">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} viewArtworkLabel={viewArtworkLabel} />
      ))}
    </div>
  );
}

function BlockView({
  block,
  viewArtworkLabel,
}: {
  block: NewsletterBlock;
  viewArtworkLabel: string;
}) {
  switch (block.type) {
    case 'cover':
      return (
        <header className="space-y-4 text-center">
          {block.imageUrl && (
            <SafeImage
              src={block.imageUrl}
              alt={block.title}
              width={1200}
              height={800}
              className="h-auto w-full rounded-lg border border-gallery-hairline"
            />
          )}
          <h2 className="text-2xl font-bold text-charcoal-deep md:text-3xl">{block.title}</h2>
          {block.subtitle && <p className="text-charcoal-muted">{block.subtitle}</p>}
        </header>
      );
    case 'text':
      // 저장 시 sanitizeRichEmailHtml 통과한 HTML
      return (
        <div
          className="text-base leading-loose text-charcoal [&_a]:text-primary-strong [&_a]:underline [&_p]:my-4"
          dangerouslySetInnerHTML={{ __html: block.html }}
        />
      );
    case 'artworkCard':
      return (
        <article className="overflow-hidden rounded-lg border border-gallery-hairline bg-white">
          <SafeImage
            src={block.snapshot.imageUrl}
            alt={block.snapshot.title}
            width={960}
            height={720}
            className="h-auto w-full"
          />
          <div className="space-y-2 p-6">
            <p className="text-eyebrow">{block.snapshot.artistName}</p>
            <h3 className="text-artwork-title text-xl">{block.snapshot.title}</h3>
            {block.snapshot.description && (
              <p className="leading-relaxed text-charcoal">{block.snapshot.description}</p>
            )}
            {block.showPrice && block.snapshot.price && (
              <p className="font-semibold text-sun-strong">{block.snapshot.price}</p>
            )}
            <a
              href={block.snapshot.url}
              className="inline-block font-medium text-primary-strong hover:underline"
            >
              {viewArtworkLabel} →
            </a>
          </div>
        </article>
      );
    case 'eventBanner':
      return (
        <div className="space-y-4 rounded-lg bg-gallery-tile p-8 text-center">
          {block.imageUrl && (
            <SafeImage
              src={block.imageUrl}
              alt={block.title}
              width={960}
              height={540}
              className="mx-auto h-auto w-full rounded"
            />
          )}
          <h3 className="text-xl font-bold text-white">{block.title}</h3>
          {block.dateText && <p className="text-sm text-gray-300">{block.dateText}</p>}
          <a
            href={block.ctaUrl}
            className="inline-block rounded-lg bg-primary-strong px-6 py-3 text-sm font-semibold text-white"
          >
            {block.ctaLabel}
          </a>
        </div>
      );
    case 'button':
      return (
        <p className="text-center">
          <a
            href={block.url}
            className="inline-block rounded-lg bg-primary-strong px-6 py-3 text-sm font-semibold text-white"
          >
            {block.label}
          </a>
        </p>
      );
    case 'divider':
      return <hr className="border-gallery-divider" />;
  }
}
