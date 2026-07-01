'use client';

import { useMemo, useState } from 'react';
import { useActionState } from 'react';
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
};

const initialState: ActionState = { message: '', error: false };

export function FundraiserSelection({
  artworks,
  maxPerArtist,
}: {
  artworks: Item[];
  maxPerArtist: number;
}) {
  const initialSelected = useMemo(
    () => new Set(artworks.filter((a) => a.isTagged).map((a) => a.id)),
    [artworks]
  );
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [state, formAction, isPending] = useActionState(
    async (_prev: ActionState) => setFundraiserSelection([...selected]),
    initialState
  );

  const count = selected.size;
  const atLimit = count >= maxPerArtist;

  const toggle = (item: Item) => {
    if (item.isSold && item.isTagged) return; // 잠금
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
          기금마련전 출품 {count}/{maxPerArtist}
        </p>
        <LinkButton
          href={`/dashboard/artworks/new?exhibition=${OH_YOON_TERRACOTTA_EXHIBITION.slug}`}
          variant="secondary"
        >
          새 작품 등록하고 출품
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
          const locked = item.isSold && item.isTagged;
          const disabled = locked || (!isChecked && atLimit);
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
                {locked && <p className="text-xs text-charcoal-soft">판매됨 · 출품 확정</p>}
              </button>
            </li>
          );
        })}
      </ul>

      <Button type="submit" variant="primary" loading={isPending} disabled={isPending}>
        출품 작품 저장
      </Button>
    </form>
  );
}
