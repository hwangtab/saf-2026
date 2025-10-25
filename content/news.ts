import { NewsArticle } from '@/lib/types';

export const newsArticles: NewsArticle[] = [
  {
    id: 'news-1',
    title: '예술인 금융 위기 해결을 위한 씨앗:페 2023 성공 개최',
    source: '뉴스아트',
    date: '2023-03-31',
    link: 'https://www.news-art.co.kr',
    description:
      '씨앗:페를 통해 1,253만원의 기금을 조성하여 예술인 상호부조 대출 기금 조성에 성공했습니다.',
  },
  {
    id: 'news-2',
    title: '한국스마트협동조합, 예술인 저금리 대출 상품 출시',
    source: '협동조합뉴스',
    date: '2023-06-15',
    link: 'https://www.kosmart.co.kr',
    description:
      '95% 상환율을 자랑하는 예술인 상호부조 대출 상품이 공식 출시되었습니다.',
  },
];

// Add more articles as they become available
// Format:
// {
//   id: unique identifier
//   title: article title
//   source: news outlet name
//   date: ISO format YYYY-MM-DD
//   link: article URL
//   thumbnail: (optional) image URL
//   description: (optional) summary
// }
