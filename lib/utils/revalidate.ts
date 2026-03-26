import { revalidatePath, revalidateTag } from 'next/cache';

export function revalidatePublicArtworkSurfaces(
  artistNames: Array<string | null | undefined> = []
): void {
  revalidatePath('/');
  revalidatePath('/artworks');
  revalidatePath('/api/artworks');

  const uniqueArtistNames = Array.from(
    new Set(
      artistNames
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );

  uniqueArtistNames.forEach((name) => {
    revalidatePath(`/artworks/artist/${encodeURIComponent(name)}`);
  });

  revalidateTag('artworks', 'max');
}
