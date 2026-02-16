export type UserRole = 'admin' | 'artist' | 'user' | 'exhibitor';
export type UserStatus = 'pending' | 'active' | 'suspended';
export type ArtworkStatus = 'available' | 'reserved' | 'sold';
export type EditionType = 'unique' | 'limited' | 'open';

export interface DatabaseProfile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}
