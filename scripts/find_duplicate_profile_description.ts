import { artworks } from '../content/saf2026-artworks';

// We need to access ARTIST_DATA directly to compare.
// saf2026-artworks imports batches and merges them.
// But we need to check if the description in the artwork matches the profile in ARTIST_DATA.

// Actually, let's just use the `artworks` array.
// For each artwork, we get `artist`.
// We look up `artist` in `ARTIST_DATA`.
// We compare `artwork.description` with `ARTIST_DATA[artist].profile`.

// However, we need to import ARTIST_DATA.
// content/artists-data.ts exports ARTIST_DATA.

// To avoid alias issues with ts-node without tsconfig-paths, allow me to define the data structures if imports fail?
// No, let's try to use the project structure.

async function findDuplicates() {
  const duplicates = [];

  // We iterate through all artworks
  for (const artwork of artworks) {
    // artwork is already hydrated?
    // saf2026-artworks exports `artworks` which is mapped with `getArtworkWithArtistData`.
    // So `artwork.profile` is already populated from `ARTIST_DATA.profile` (if not present in artwork itself).

    // We want to compare `artwork.description` (Artist Note) with `artwork.profile` (Artist Profile).
    // Since `artwork.profile` comes from `ARTIST_DATA.profile` (usually),
    // we can just compare `artwork.description` and `artwork.profile`.

    if (artwork.description && artwork.profile) {
      // Normalize strings to ignore minor whitespace differences if needed, but user said "identical".
      // Let's trim.
      const desc = artwork.description.trim();
      const prof = artwork.profile.trim();

      if (desc === prof && desc.length > 0) {
        duplicates.push({
          artist: artwork.artist,
          title: artwork.title,
          id: artwork.id,
        });
      }
    }
  }

  // Group by artist
  const artistMap = new Map();
  duplicates.forEach((d) => {
    if (!artistMap.has(d.artist)) {
      artistMap.set(d.artist, []);
    }
    artistMap.get(d.artist).push(d.title);
  });

  console.log('Artists with identical Profile and Description:');
  artistMap.forEach((titles, artist) => {
    console.log(`- ${artist} (Artworks: ${titles.length})`);
  });

  if (artistMap.size === 0) {
    console.log('No duplicates found.');
  }
}

findDuplicates();
