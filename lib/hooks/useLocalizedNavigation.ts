'use client';

import { useTranslations } from 'next-intl';

import { NavigationItem } from '@/types';

export function useLocalizedNavigation(): NavigationItem[] {
  const t = useTranslations('nav');

  return [
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
          name: t('transparency'),
          href: '/transparency',
          description: t('transparencyDesc'),
        },
        {
          name: t('news'),
          href: '/news',
          description: t('newsDesc'),
        },
      ],
    },
    {
      name: t('magazine'),
      href: '/stories',
      items: [
        {
          name: t('allStories'),
          href: '/stories',
          description: t('allStoriesDesc'),
        },
        {
          name: t('artistStories'),
          href: '/stories?category=artist-story',
          description: t('artistStoriesDesc'),
        },
        {
          name: t('buyingGuide'),
          href: '/stories?category=buying-guide',
          description: t('buyingGuideDesc'),
        },
        {
          name: t('artKnowledge'),
          href: '/stories?category=art-knowledge',
          description: t('artKnowledgeDesc'),
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
  ];
}

export function useLocalizedUtilityNavigation(): NavigationItem[] {
  const t = useTranslations('nav');

  return [
    {
      name: t('orderStatus'),
      href: '/orders',
      external: false,
    },
  ];
}
