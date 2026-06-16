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

  // 작가명은 한글 등 non-ASCII가 흔하다. revalidatePath에 raw 한글 경로를 넘기면
  // Next.js가 캐시 태그로 직렬화할 때 Latin-1(ByteString) 변환에 실패해
  // "Cannot convert argument to a ByteString"로 응답이 500 처리된다(server action try/catch 밖에서 발생).
  // 실제 서빙 경로도 URL 인코딩되므로 encodeURIComponent가 캐시 매칭·안전성 양쪽에 맞다.
  uniqueArtistNames.forEach((name) => {
    const encoded = encodeURIComponent(name);
    revalidatePath(`/artworks/artist/${encoded}`);
    revalidatePath(`/en/artworks/artist/${encoded}`);
  });

  revalidateTag('artworks', 'max');
}
