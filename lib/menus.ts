import { EXTERNAL_LINKS } from '@/lib/constants';
import { UI_STRINGS } from '@/lib/ui-strings';
import { NavigationItem } from '@/types';

export const MAIN_NAVIGATION: NavigationItem[] = [
    {
        name: '소개',
        href: '#',
        items: [
            {
                name: '우리의 현실',
                href: '/our-reality',
                description: '예술인 금융 소외의 구조적 원인',
            },
            {
                name: '우리의 증명',
                href: '/our-proof',
                description: '상호부조 대출의 데이터 증명',
            },
            {
                name: '언론 보도',
                href: '/news',
                description: '씨앗페와 함께한 언론의 기록',
            },
        ],
    },
    {
        name: '아카이브',
        href: '/archive',
        items: [
            {
                name: '2026 씨앗페',
                href: '/archive/2026',
                description: '올해의 전시 기록',
            },
            {
                name: '2023 씨앗페',
                href: '/archive/2023',
                description: '지난 씨앗페의 기록',
            },
        ],
    },
    {
        name: '출품작',
        href: '/artworks',
        items: [
            {
                name: '전체 출품작',
                href: '/artworks',
                description: '씨앗페 2026 모든 출품작 보기',
            },
        ],
    },
];

export const UTILITY_NAVIGATION: NavigationItem[] = [
    {
        name: UI_STRINGS.NAV.ORDER_STATUS,
        href: EXTERNAL_LINKS.ORDER_STATUS,
        external: true,
    },
];
