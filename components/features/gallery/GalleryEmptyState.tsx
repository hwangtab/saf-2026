import { UI_STRINGS } from '@/lib/ui-strings';

interface GalleryEmptyStateProps {
  onReset: () => void;
}

export default function GalleryEmptyState({ onReset }: GalleryEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {UI_STRINGS.SEARCH.NO_RESULTS_TITLE}
      </h3>
      <p className="text-gray-500 mb-6">{UI_STRINGS.SEARCH.NO_RESULTS_DESC}</p>
      <button
        onClick={onReset}
        className="px-6 py-2 bg-charcoal text-white rounded-full hover:bg-black transition-colors"
      >
        {UI_STRINGS.SEARCH.RESET_BUTTON}
      </button>
    </div>
  );
}
