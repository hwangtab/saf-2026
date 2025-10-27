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
];
