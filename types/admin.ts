import { UserRole, UserStatus } from './database.types';

export type Profile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  application?: {
    artist_name: string;
    contact: string;
    bio: string;
    referrer: string | null;
    updated_at: string;
  } | null;
  exhibitorApplication?: {
    representative_name: string;
    contact: string;
    bio: string;
    referrer: string | null;
    updated_at: string;
  } | null;
};

export type UnlinkedArtistOption = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string | null;
  artwork_count: number;
};

export type UserSortKey = 'user' | 'status_role' | 'application';
export type SortDirection = 'asc' | 'desc';

export type InitialFilters = {
  role?: string;
  status?: string;
  q?: string;
  applicant?: string;
};
