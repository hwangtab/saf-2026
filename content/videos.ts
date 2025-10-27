export interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  thumbnail?: string;
}

export const videos: Video[] = [
  {
    id: '1',
    title: '씨앗:페 2023 영상 기록',
    description: '씨앗:페 2023 현장을 담은 영상 아카이브입니다.',
    youtubeId: '-HicY7-natU',
  },
  {
    id: '2',
    title: '[씨앗페] 파르베 Full Live (2023.3.25 @인디프레스 갤러리)',
    description:
      '예술가가 이사나 질병 등의 상황에서 은행 대출을 거절당하는 현실을 전하며 연 20% 고금리 문제를 공유한 씨앗페 공연 실황입니다.',
    youtubeId: 'ZFnswRrM01M',
  },
  {
    id: '3',
    title: '[씨앗페] 여유와 설빈 Full Live (2023.3.25 @오디오가이 스튜디오)',
    description:
      '은행 문턱에서 배제되는 예술인의 현실을 이야기하며 연 20% 고금리 문제를 짚은 씨앗페 라이브 세션입니다.',
    youtubeId: 'Tp8UWQudv50',
  },
  {
    id: '4',
    title: '[씨앗페] 호와호 Full Live (2023.3.26 @오디오가이 스튜디오)',
    description:
      '씨앗페 무대에서 호와호가 들려주는 전곡 라이브. 예술인 상호부조 대출 캠페인 취지를 알리는 공연 영상입니다.',
    youtubeId: '65QiH2mBHcc',
  },
  {
    id: '5',
    title: "이익태 - '피멍' (2023 씨앗페 오프닝 퍼포먼스)",
    description:
      '한국스마트협동조합이 개최한 씨앗페 오프닝 퍼포먼스. 이익태 작가가 씨앗페의 주제의식을 담아 선보인 작품입니다.',
    youtubeId: 'zCvlguR9jMc',
  },
  {
    id: '6',
    title: '[씨앗페] 윤장현 Performance (2023.3.24 @인디프레스 갤러리)',
    description:
      '윤장현 아티스트가 인디프레스 갤러리에서 펼친 씨앗페 퍼포먼스. 예술인 대출의 필요성을 공유하는 무대입니다.',
    youtubeId: 'tjmScl936q4',
  },
  {
    id: '7',
    title: '[씨앗페] Jinu Konda Full Live (2023.3.26 @인디프레스 갤러리)',
    description:
      '씨앗페 인디프레스 갤러리에서 진행된 Jinu Konda의 전곡 라이브 세트 영상입니다.',
    youtubeId: 'd-LeLZcQ4RA',
  },
  {
    id: '8',
    title: '[씨앗페] 윤선애 Full Live (2023.3.26 @인디프레스 갤러리)',
    description:
      '윤선애 아티스트가 전하는 씨앗페 라이브 공연 영상. 예술인 상호부조 캠페인을 지지하는 무대입니다.',
    youtubeId: 'XL8WAd_WUw0',
  },
  {
    id: '9',
    title: '[씨앗페] 자이 Full Live (2023.3.26 @오디오가이 스튜디오)',
    description:
      '씨앗페 오디오가이 스튜디오에서 진행된 자이의 라이브 풀버전 영상입니다.',
    youtubeId: 'KK3POxK7U6w',
  },
];
