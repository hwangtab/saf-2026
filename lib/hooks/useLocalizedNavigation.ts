'use client';

import { useTranslations } from 'next-intl';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { NavigationItem } from '@/types';

export function useLocalizedNavigation(): NavigationItem[] {
  const t = useTranslations('nav');

  return [
    {
      name: t('intro'),
      href: '#',
      items: [
        {
          name: t('ourReality'),
          href: '/our-reality',
          description: t('ourRealityDesc'),
        },
        {
          name: t('ourProof'),
          href: '/our-proof',
          description: t('ourProofDesc'),
        },
        {
          name: t('news'),
          href: '/news',
          description: t('newsDesc'),
        },
      ],
    },
    {
      name: t('archive'),
      href: '/archive',
      items: [
        {
          name: t('archive2026'),
          href: '/archive/2026',
          description: t('archive2026Desc'),
        },
        {
          name: t('archive2023'),
          href: '/archive/2023',
          description: t('archive2023Desc'),
        },
      ],
    },
    {
      name: t('artworks'),
      href: '/artworks',
      items: [
        {
          name: t('allArtworks'),
          href: '/artworks',
          description: t('allArtworksDesc'),
        },
        {
          name: t('ohYoon'),
          href: '/special/oh-yoon',
          description: t('ohYoonDesc'),
        },
      ],
    },
  ];
}

export function useLocalizedUtilityNavigation(): NavigationItem[] {
  const t = useTranslations('nav');

  return [
    {
      name: t('orderStatus'),
      href: EXTERNAL_LINKS.ORDER_STATUS,
      external: true,
    },
  ];
}
