import { getLocale, getTranslations } from 'next-intl/server';
import { containsHangul } from '@/lib/search-utils';
import type { Article } from '@/content/artist-articles';

interface RelatedArticlesProps {
  articles: Article[];
}

export default async function RelatedArticles({ articles }: RelatedArticlesProps) {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const t = await getTranslations('relatedArticles');

  const localizeSource = (source: string): string => {
    if (locale !== 'en') return source;

    const sourceMap: Record<string, string> = {
      경향신문: 'Kyunghyang Shinmun',
      뉴시스: 'Newsis',
      뉴스프리존: 'NewsFreeZone',
      아주경제: 'Aju Business Daily',
      위클리피플: 'Weekly People',
      한국예술문화단체총연합회: 'Korean Federation of Arts and Culture Organizations',
      한국예총: 'Korean Artists Federation',
      비마이너: 'BeMinor',
    };

    if (sourceMap[source]) {
      return sourceMap[source];
    }

    return containsHangul(source) ? 'Korean media' : source;
  };

  const localizeTitle = (title: string, source: string): string => {
    if (locale !== 'en') return title;
    const localizedSource = localizeSource(source);
    if (!title || containsHangul(title)) {
      return `${localizedSource} · ${t('originalKoreanTitle')}`;
    }
    return title;
  };

  const localizeDescription = (description: string): string => {
    if (locale !== 'en') return description;
    if (!description) return '';
    if (containsHangul(description)) {
      return t('originalKoreanDescription');
    }
    return description;
  };

  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-primary/10 p-6">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
        {t('sectionTitle')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => {
          const localizedSource = localizeSource(article.source);
          const localizedTitle = localizeTitle(article.title, article.source);
          const localizedDescription = localizeDescription(article.description);

          return (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group block p-5 bg-white border border-gray-200 rounded-2xl hover:border-primary hover:shadow-xl transition-[box-shadow,border-color] duration-300"
            >
              {/* Source Badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="inline-block px-2.5 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
                  {localizedSource}
                </span>
                <svg
                  className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>

              {/* Title */}
              <h3 className="font-bold text-charcoal mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                {localizedTitle}
              </h3>

              {/* Description */}
              <p className="text-sm text-charcoal-muted line-clamp-3 leading-relaxed">
                {localizedDescription}
              </p>
            </a>
          );
        })}
      </div>
    </section>
  );
}
