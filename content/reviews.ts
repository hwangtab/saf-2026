export interface Review {
  id: string;
  author: string;
  role: string;
  rating: number;
  comment: string;
  date: string;
}

export const exhibitionReviews: Review[] = [
  {
    id: 'rev-1',
    author: '김OO',
    role: '미술교사',
    rating: 5,
    comment:
      '단순한 전시를 넘어 예술인들의 현실을 마주하고 연대할 수 있는 뜻깊은 시간이었습니다. 특히 상환율 95%라는 숫자가 주는 울림이 컸습니다.',
    date: '2026-01-15',
  },
  {
    id: 'rev-2',
    author: '박OO',
    role: '인사동 나들이객',
    rating: 5,
    comment:
      '우연히 들어왔다가 작품들의 에너지에 압도되었습니다. 예술가들에게 직접적인 도움이 되는 캠페인이라니 더 의미 있게 다가오네요.',
    date: '2026-01-18',
  },
  {
    id: 'rev-3',
    author: '최OO',
    role: '청년 작가',
    rating: 5,
    comment:
      '동료 작가님들의 작품을 보며 많은 영감을 받았습니다. 우리를 위한 안전망이 구축되고 있다는 사실만으로도 큰 위로가 됩니다.',
    date: '2026-01-20',
  },
  {
    id: 'rev-4',
    author: '이OO',
    role: '인근 직장인',
    rating: 4.5,
    comment:
      '점심시간에 잠시 들렀는데 전시 공간이 너무 따뜻하고 좋았습니다. 예술인 금융 수치들을 보니 우리가 몰랐던 현실에 대해 다시 생각해보게 되네요.',
    date: '2026-01-22',
  },
  {
    id: 'rev-5',
    author: '정OO',
    role: '문화예술 후원자',
    rating: 5,
    comment:
      '조합의 투명한 운영과 예술가들의 진정성이 느껴지는 전시입니다. 더 많은 분들이 이 캠페인에 참여하여 예술의 씨앗을 함께 틔웠으면 좋겠습니다.',
    date: '2026-01-24',
  },
];
