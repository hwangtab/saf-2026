import { revalidatePath, revalidateTag } from 'next/cache';

export function revalidatePublicArtworkSurfaces(
  artistNames: Array<string | null | undefined> = []
): void {
  revalidatePath('/');
  revalidatePath('/en');
  revalidatePath('/artworks');
  revalidatePath('/en/artworks');
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
    const slug = encodeURIComponent(name);
    revalidatePath(`/artworks/artist/${slug}`);
    revalidatePath(`/en/artworks/artist/${slug}`);
  });

  revalidateTag('artworks', 'max');
}
