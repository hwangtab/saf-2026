import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function validateMigration() {
  console.log('🚀 Starting migration validation...\n');
  let overallSuccess = true;

  try {
    console.log('🔍 Checking 1: Sold artworks have corresponding sales entries...');
    const { data: soldArtworks, error: err1 } = await supabase
      .from('artworks')
      .select('id, title')
      .eq('status', 'sold');

    if (err1) throw err1;

    const { data: salesEntries, error: err2 } = await supabase
      .from('artwork_sales')
      .select('artwork_id, quantity');

    if (err2) throw err2;

    const artworkIdsWithSales = new Set(salesEntries.map((s) => s.artwork_id));

    const missingSales = soldArtworks.filter((a) => !artworkIdsWithSales.has(a.id));

    if (missingSales.length === 0) {
      console.log('✅ PASS: All sold artworks have sales entries.');
    } else {
      console.error(`❌ FAIL: ${missingSales.length} sold artworks are missing sales entries.`);
      missingSales.forEach((a) => console.log(`   - ID: ${a.id}, Title: ${a.title}`));
      overallSuccess = false;
    }

    console.log(
      '\n🔍 Checking 2: Sales entries only exist for sold artworks (or multiple editions)...'
    );
    const { data: allArtworks, error: err3 } = await supabase
      .from('artworks')
      .select('id, status, edition, edition_type');

    if (err3) throw err3;

    const artworkMap = new Map(allArtworks.map((a) => [a.id, a]));
    const invalidSales = salesEntries.filter((s) => {
      const artwork = artworkMap.get(s.artwork_id);
      if (!artwork) return true;

      const isSold = artwork.status === 'sold';
      const isMultipleEdition =
        artwork.edition_type === 'open' ||
        artwork.edition_type === 'limited' ||
        (typeof artwork.edition === 'number' && artwork.edition > 1) ||
        (typeof artwork.edition === 'string' && parseInt(artwork.edition) > 1);

      return !isSold && !isMultipleEdition;
    });

    if (invalidSales.length === 0) {
      console.log('✅ PASS: Sales entries correctly associated.');
    } else {
      console.error(
        `❌ FAIL: ${invalidSales.length} sales entries found for non-sold single-edition artworks.`
      );
      overallSuccess = false;
    }

    console.log('\n🔍 Checking 3: Limited editions do not exceed their limits...');
    const { data: limitedArtworks, error: err4 } = await supabase
      .from('artworks')
      .select('id, title, edition_limit')
      .eq('edition_type', 'limited');

    if (err4) throw err4;

    const salesCountMap = new Map<string, number>();
    salesEntries.forEach((s) => {
      salesCountMap.set(s.artwork_id, (salesCountMap.get(s.artwork_id) || 0) + (s.quantity || 1));
    });

    const exceededLimit = limitedArtworks.filter((a) => {
      const count = salesCountMap.get(a.id) || 0;
      return count > (a.edition_limit || 0);
    });

    if (exceededLimit.length === 0) {
      console.log('✅ PASS: No limited editions exceeded their limits.');
    } else {
      console.error(`❌ FAIL: ${exceededLimit.length} limited editions exceeded their limits.`);
      exceededLimit.forEach((a) => {
        const count = salesCountMap.get(a.id) || 0;
        console.log(
          `   - ID: ${a.id}, Title: ${a.title}, Sales: ${count}, Limit: ${a.edition_limit}`
        );
      });
      overallSuccess = false;
    }

    console.log(
      '\n🔍 Checking 4: Specific artists (오윤, 이윤엽, 류연복) set to "open" edition...'
    );
    const { data: artists, error: err5 } = await supabase
      .from('artists')
      .select('id, name_ko')
      .in('name_ko', ['오윤', '이윤엽', '류연복']);

    if (err5) throw err5;

    const targetArtistIds = artists.map((a) => a.id);
    const { data: artistArtworks, error: err6 } = await supabase
      .from('artworks')
      .select('id, title, artist_id, edition_type')
      .in('artist_id', targetArtistIds);

    if (err6) throw err6;

    const nonOpenArtworks = artistArtworks.filter((a) => a.edition_type !== 'open');

    if (nonOpenArtworks.length === 0) {
      console.log('✅ PASS: All artworks by target artists are set to "open" edition.');
    } else {
      console.error(
        `❌ FAIL: ${nonOpenArtworks.length} artworks by target artists are NOT "open".`
      );
      nonOpenArtworks.forEach((a) => {
        const artist = artists.find((art) => art.id === a.artist_id);
        console.log(
          `   - ID: ${a.id}, Artist: ${artist?.name_ko}, Title: ${a.title}, Type: ${a.edition_type}`
        );
      });
      overallSuccess = false;
    }

    console.log('\n=========================================');
    if (overallSuccess) {
      console.log('🎉 VALIDATION SUCCESSFUL: All data integrity checks passed!');
    } else {
      console.error('⚠️ VALIDATION FAILED: Some data integrity checks failed.');
      process.exit(1);
    }
    console.log('=========================================\n');
  } catch (error) {
    console.error('❌ Unexpected error during validation:', error);
    process.exit(1);
  }
}

// Usage: npx tsx scripts/validate-migration.ts
validateMigration();
