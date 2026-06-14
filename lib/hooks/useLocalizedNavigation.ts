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
          name: t('spaceCollections'),
          href: '/collections',
          description: t('spaceCollectionsDesc'),
        },
        {
          name: t('parkSaenggwang'),
          href: '/artworks/artist/박생광',
          description: t('parkSaenggwangNavDesc'),
        },
      ],
    },
    {
      // 오윤 40주기 캠페인 묶음: 추도식(시기성 행동) + 청원(시민 행동) + 오윤 작품.
      name: t('ohYoon40th'),
      href: '/event/oh-yoon-memorial',
      items: [
        {
          name: t('ohYoonMemorial'),
          href: '/event/oh-yoon-memorial',
          description: t('ohYoonMemorialDesc'),
        },
        {
          name: t('ohYoonPetition'),
          href: '/petition/oh-yoon',
          description: t('ohYoonPetitionDesc'),
        },
        {
          name: t('ohYoon'),
          href: '/artworks/artist/오윤',
          description: t('ohYoonDesc'),
        },
      ],
    },
    {
      name: t('intro'),
      href: '/about',
      items: [
        {
          name: t('aboutSaf'),
          href: '/about',
          description: t('aboutSafDesc'),
        },
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
          name: t('updates'),
          href: '/changelog',
          description: t('updatesDesc'),
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
          href: '/stories/category/artist-story',
          description: t('artistStoriesDesc'),
        },
        {
          name: t('buyingGuide'),
          href: '/stories/category/buying-guide',
          description: t('buyingGuideDesc'),
        },
        {
          name: t('artKnowledge'),
          href: '/stories/category/art-knowledge',
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
    // 오윤 청원·추도식은 '오윤 40주기' 그룹(위)으로 묶어 헤더에 노출.
    // 추도식은 2026-07-05 행사 종료 후 메뉴에서 제거할 것.
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
