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
    title: '씨앗:페 2026 캠페인 영상',
    description: '한국 예술인들의 금융 위기 해결을 위한 씨앗:페 2026 캠페인 소개 영상입니다.',
    youtubeId: '-HicY7-natU',
  },
];
