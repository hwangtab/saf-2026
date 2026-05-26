import { storageGet, storageSet } from './storage';

const WISHLIST_KEY = 'saf:wishlist';

export function getWishlist(): string[] {
  const parsed = storageGet<unknown>(WISHLIST_KEY);
  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

export function isInWishlist(artworkId: string): boolean {
  return getWishlist().includes(artworkId);
}

export function addToWishlist(artworkId: string): string[] {
  const list = getWishlist();
  if (list.includes(artworkId)) return list;
  const next = [artworkId, ...list];
  storageSet(WISHLIST_KEY, next);
  return next;
}

export function removeFromWishlist(artworkId: string): string[] {
  const next = getWishlist().filter((id) => id !== artworkId);
  storageSet(WISHLIST_KEY, next);
  return next;
}

export function toggleWishlist(artworkId: string): { ids: string[]; added: boolean } {
  if (isInWishlist(artworkId)) {
    return { ids: removeFromWishlist(artworkId), added: false };
  }
  return { ids: addToWishlist(artworkId), added: true };
}

export function clearWishlist(): string[] {
  storageSet(WISHLIST_KEY, []);
  return [];
}
