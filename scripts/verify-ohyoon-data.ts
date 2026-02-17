import { artworks } from '../content/saf2026-artworks';

const ohYoonArtworks = artworks.filter((a: any) => a.artist === '오윤');
console.log(`Found ${ohYoonArtworks.length} artworks`);
console.log(
  'Sample IDs:',
  ohYoonArtworks.slice(0, 3).map((a: any) => a.id)
);
