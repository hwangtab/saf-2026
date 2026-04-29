'use client';

import { useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export type IncompleteItem = {
  label: string;
  reason: string;
  targetId?: string;
};

type IncompleteItemsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  items: IncompleteItem[];
  onSelectItem?: (item: IncompleteItem) => void;
};

export function IncompleteItemsModal({
  isOpen,
  onClose,
  title,
  description,
  items,
  onSelectItem,
}: IncompleteItemsModalProps) {
  const locale = useLocale();
  const copy =
    locale === 'en'
      ? {
          listAria: 'Incomplete items list',
          close: 'Review and go back',
        }
      : {
          listAria: '미완료 항목 목록',
          close: '확인하고 돌아가기',
        };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-lg">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>
        <ul className="space-y-2" aria-label={copy.listAria}>
          {items.map((item) => (
            <li
              key={`${item.label}-${item.reason}`}
              className="rounded-lg border border-gray-200 bg-gray-50 p-3"
            >
              {onSelectItem && item.targetId ? (
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="mt-1 text-xs text-charcoal-muted">{item.reason}</p>
                </button>
              ) : (
                <>
                  <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                  <p className="mt-1 text-xs text-charcoal-muted">{item.reason}</p>
                </>
              )}
            </li>
          ))}
        </ul>
        <div className="pt-2">
          <Button type="button" onClick={onClose} variant="secondary" className="w-full">
            {copy.close}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
