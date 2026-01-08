'use client';

import Link from 'next/link';
import type { Article } from '@/content/artist-articles';

interface RelatedArticlesProps {
  articles: Article[];
}

export default function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (!articles || articles.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 p-6 rounded-xl">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
        작가 관련 자료
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Link
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block p-5 bg-white border border-gray-200 rounded-lg hover:border-primary hover:shadow-md transition-all duration-300"
          >
            {/* Source Badge */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-block px-2.5 py-1 text-xs font-bold text-primary bg-primary/10 rounded">
                {article.source}
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
              {article.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-charcoal-muted line-clamp-3 leading-relaxed">
              {article.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
