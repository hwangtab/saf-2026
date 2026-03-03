import { revalidatePath } from 'next/cache';

type RevalidateArtworkPathsOpts = {
  id?: string;
  artistSlug?: string;
  portal?: 'admin' | 'dashboard' | 'exhibitor';
};

/**
 * Revalidates common artwork-related paths.
 * Always includes /artworks and /. Pass opts for more specific paths.
 */
export function revalidateArtworkPaths(opts: RevalidateArtworkPathsOpts = {}): void {
  revalidatePath('/artworks');
  revalidatePath('/');

  if (opts.id) {
    revalidatePath(`/artworks/${opts.id}`);
  }

  if (opts.artistSlug) {
    revalidatePath(`/artworks/artist/${opts.artistSlug}`);
  }

  if (opts.portal === 'admin') {
    revalidatePath('/admin/artworks');
    if (opts.id) {
      revalidatePath(`/admin/artworks/${opts.id}`);
    }
  } else if (opts.portal === 'dashboard') {
    revalidatePath('/dashboard/artworks');
  } else if (opts.portal === 'exhibitor') {
    revalidatePath('/exhibitor/artworks');
    if (opts.id) {
      revalidatePath(`/exhibitor/artworks/${opts.id}`);
    }
  }
}
