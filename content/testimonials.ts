export interface TestimonialItem {
  quote: string;
  author: string;
  context?: string;
}

export interface TestimonialCategory {
  category: string;
  items: TestimonialItem[];
}

export const testimonials: TestimonialCategory[] = [
  {
    category: '1. 생존의 위협: "돈이 없어 치료를 포기했습니다"',
    items: [
      {
        quote: '아이들 모르게 나만 3일을 <strong>굶었던</strong> 기억.',
        author: '50대, 연극인',
      },
      {
        quote:
          '돈이 없어 절박했던 치과 <strong>치료를 못 받고</strong> 있어요. 병원을 제때 가야 하는데, 안 가고 웬만하면 참는 것이 이젠 습관이 돼버렸습니다.',
        author: '50대, 배우',
      },
      {
        quote:
          '돈이 없어서 귀 치료를 계속 <strong>미뤘고</strong>, 그로 인해 양쪽 귀 다 증상이 <strong>악화</strong>됐습니다.',
        author: '30대, 음악인',
      },
      {
        quote:
          '병원에 입원 중이신 어머니의 병원비를 <strong>낼 수 없어</strong>, 퇴원을 <strong>미루기도</strong>, 받아야 할 검사와 치료를 <strong>포기하실 수밖에</strong> 없었습니다.',
        author: '50대, 배우/방송인',
      },
      {
        quote:
          '임대료 연체로 인해 단체 사업장이자 거주지에서 <strong>비자발적으로 퇴거</strong>해야 하는 상황이 있었습니다. 금융권은 물론 예술인 대출도 도움이 되지 못했습니다.',
        author: '50대, 배우',
      },
      {
        quote:
          '경제적 형편의 문제로 갈 곳이 없어 고시원, 연습실 등을 전전하다 한동안 <strong>노숙을 한 적이</strong> 있습니다.',
        author: '30대, 음악인',
      },
    ],
  },
  {
    category: '2. 창작의 좌절: "공연을 할수록 빚만 늘어 그만두기로 했습니다"',
    items: [
      {
        quote:
          '하루 4시간도 채 못 자며 알바와 연극을 병행하지만, 공연을 할수록 빚만 늘어가는 상황이 계속되어 <strong>공연을 그만두기로 함</strong>.',
        author: '30대, 배우',
      },
      {
        quote:
          '작품보다 매달의 <strong>금전적 해결을 우선</strong>순위로 집중해야 하는 상황이 아쉽습니다. 예술인으로서 큰 수익을 내려면 작품이 잘 돼야 하는데, 작품보다 매달 소일거리 찾기에 집중해야 함이 <strong>악순환</strong> 속에 갇혀있는 느낌이 듭니다.',
        author: '40대, 음악인',
      },
      {
        quote:
          '당장의 매달 닥쳐오는 대출금으로 인해 <strong>공연을 접고 알바에 집중</strong>한 적이 많음.',
        author: '50대, 배우',
      },
      {
        quote:
          '독촉 전화로 <strong>연습과 공연에 지장을 주고</strong>, 이로 인해 심리적 부담감과 압박이 하루하루를 <strong>고통스럽게</strong> 하고 다음날이 <strong>두려워짐</strong>.',
        author: '40대, 연극인',
      },
      {
        quote:
          '돈이 없으면 삶이 <strong>무너지는데</strong> 예술 창작은 <strong>꿈도 못 꾸죠</strong>.',
        author: '50대, 예술가',
      },
    ],
  },
  {
    category: '3. 관계의 단절과 인간적 모멸감: "치욕감과 인연 단절"',
    items: [
      {
        quote:
          '지인들에게 돈을 빌리면서 드는 그 <strong>치욕감과 인연 단절</strong>, 그리고 갚지 못하면서 밀려오는 압박감, <strong>무력감</strong>.',
        author: '50대, 만화가/미술가',
      },
      {
        quote:
          '힘들 때는 친한 지인의 경조사에 참석할 수도 없을 정도였고, 그로 인해 <strong>인간관계조차 단절</strong>된 적이 있다.',
        author: '50대, 배우/방송인',
      },
      {
        quote:
          '서민을 위한 제도임에도 예술인이라는 이유로 증빙이 부족할 때 <strong>자괴감</strong>을 느낍니다.',
        author: '30대, 영화/방송인',
      },
      {
        quote: "연극배우라고 하자 '<strong>무직자</strong>'라고 대출담당으로부터 들었던 것.",
        author: '50대, 배우',
      },
    ],
  },
];
