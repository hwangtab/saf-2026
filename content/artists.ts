import { Artist } from '@/lib/types';

export const artists: Artist[] = [
  // Musicians
  {
    id: 'musician-1',
    name: '강호중',
    role: 'musician',
  },
  {
    id: 'musician-2',
    name: '고효경',
    role: 'musician',
  },
  {
    id: 'musician-3',
    name: '길가는밴드 장현호',
    role: 'musician',
  },
  {
    id: 'musician-4',
    name: '김가영',
    role: 'musician',
  },
  {
    id: 'musician-5',
    name: '곽푸른하늘',
    role: 'musician',
  },
  {
    id: 'musician-6',
    name: '권나무',
    role: 'musician',
  },
  {
    id: 'musician-7',
    name: '단아모와 친구들',
    role: 'musician',
  },
  {
    id: 'musician-8',
    name: '단편선',
    role: 'musician',
  },
  {
    id: 'musician-9',
    name: '박가빈 명창',
    role: 'musician',
  },
  {
    id: 'musician-10',
    name: '박준',
    role: 'musician',
  },
  // Visual Artists
  {
    id: 'artist-1',
    name: '김계환',
    role: 'artist',
  },
  {
    id: 'artist-2',
    name: '김수길',
    role: 'artist',
  },
  {
    id: 'artist-3',
    name: '김억',
    role: 'artist',
  },
  {
    id: 'artist-4',
    name: '김영미',
    role: 'artist',
  },
  {
    id: 'artist-5',
    name: '김영진',
    role: 'artist',
  },
  {
    id: 'artist-6',
    name: '김우성',
    role: 'artist',
  },
  {
    id: 'artist-7',
    name: '김이하',
    role: 'artist',
  },
  {
    id: 'artist-8',
    name: '김재홍',
    role: 'artist',
  },
  {
    id: 'artist-9',
    name: '김정헌',
    role: 'artist',
  },
  {
    id: 'artist-10',
    name: '김준권',
    role: 'artist',
  },
];

// Filter artists by role
export const getArtistsByRole = (role: Artist['role']): Artist[] => {
  return artists.filter((artist) => artist.role === role);
};

// Get total count
export const getTotalArtistsCount = (): number => {
  return artists.length;
};
