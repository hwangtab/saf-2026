'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import LinkButton from '@/components/ui/LinkButton';
import SafeImage from '@/components/common/SafeImage';
import { setFundraiserSelection } from '@/app/actions/fundraiser';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';
import type { ActionState } from '@/types';

type Item = {
  id: string;
  title: string;
  image: string | null;
  price: string | null;
  isTagged: boolean;
  isSold: boolean;
  isHidden: boolean;
};

const initialState: ActionState = { message: '', error: false };

export function FundraiserSelection({
  artworks,
  maxPerArtist,
}: {
  artworks: Item[];
  maxPerArtist: number;
}) {
  const t = useTranslations('dashboard.fundraiser');
  const initialSelected = useMemo(
    () => new Set(artworks.filter((a) => a.isTagged).map((a) => a.id)),
    [artworks]
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const selectedRef = useRef(selected);
  useLayoutEffect(() => {
    selectedRef.current = selected;
  });
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState) => setFundraiserSelection([...selectedRef.current]),
    initialState
  );

  const count = selected.size;
  const atLimit = count >= maxPerArtist;

  const toggle = (item: Item) => {
    if (item.isSold) return; // 판매된 작품은 태그 추가/제거 모두 불가
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else {
        if (next.size >= maxPerArtist) return prev;
        next.add(item.id);
      }
      return next;
    });
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-charcoal-deep">
          {t('counter', { count, max: maxPerArtist })}
        </p>
        <LinkButton
          href={`/dashboard/artworks/new?exhibition=${OH_YOON_TERRACOTTA_EXHIBITION.slug}`}
          variant="secondary"
        >
          {t('newArtworkCta')}
        </LinkButton>
      </div>

      {state.message && (
        <p className={state.error ? 'text-sm text-danger' : 'text-sm text-success'}>
          {state.message}
        </p>
      )}

      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {artworks.map((item) => {
          const isChecked = selected.has(item.id);
          const soldLocked = item.isSold && item.isTagged;
          const soldUnavailable = item.isSold && !item.isTagged;
          const disabled = item.isSold || (!isChecked && atLimit);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => toggle(item)}
                disabled={disabled}
                aria-pressed={isChecked}
                className={
                  'block w-full rounded-xl border p-2 text-left transition ' +
                  (isChecked
                    ? 'border-primary ring-2 ring-primary/40'
                    : 'border-gallery-hairline') +
                  (disabled ? ' opacity-50' : '')
                }
              >
                {item.image && (
                  <SafeImage
                    src={item.image}
                    alt={item.title}
                    width={300}
                    height={300}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                )}
                <p className="mt-2 truncate text-sm text-charcoal">{item.title}</p>
                {soldLocked && <p className="text-xs text-charcoal-soft">{t('soldLocked')}</p>}
                {soldUnavailable && (
                  <p className="text-xs text-charcoal-soft">{t('soldUnavailable')}</p>
                )}
                {item.isHidden && (
                  <p className="mt-1 text-xs text-charcoal-soft">{t('hiddenNote')}</p>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
        {t('saveButton')}
      </Button>
    </form>
  );
}
