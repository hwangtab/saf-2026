import { revalidatePath, revalidateTag } from 'next/cache';

export function revalidatePublicArtworkSurfaces(
  artistNames: Array<string | null | undefined> = []
): void {
  revalidatePath('/');
  revalidatePath('/en');
  revalidatePath('/artworks');
  revalidatePath('/en/artworks');
  // /api/artworks는 Route Handler — revalidatePath는 page 캐시 대상이라 no-op.
  // route 자체의 unstable_cache는 아래 revalidateTag('artworks', 'max')가 무효화.

  const uniqueArtistNames = Array.from(
    new Set(
      artistNames
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );

  uniqueArtistNames.forEach((name) => {
    revalidatePath(`/artworks/artist/${name}`);
    revalidatePath(`/en/artworks/artist/${name}`);
  });

  revalidateTag('artworks', 'max');
}
