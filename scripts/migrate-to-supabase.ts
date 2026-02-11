// @ts-nocheck
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const jiti = require('jiti')(__dirname, {
  alias: {
    '@': path.join(__dirname, '..'), // Point @ to project root
  },
});

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Data Loaders using jiti
const { newsArticles } = jiti('../content/news.ts');
const { faqs } = jiti('../content/faq.ts');
const { testimonials } = jiti('../content/testimonials.ts');
const { videos } = jiti('../content/videos.ts');
const { ARTIST_DATA } = jiti('../content/artists-data.ts');
const { artworks } = jiti('../content/saf2026-artworks.ts');
const { exhibitionReviews } = jiti('../content/reviews.ts');

function getAllFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

async function migrateReviews() {
  console.log('Migrating Reviews...');
  const { error } = await supabase.from('reviews').upsert(
    exhibitionReviews.map((item) => ({
      author: item.author,
      role: item.role,
      rating: item.rating,
      comment: item.comment,
      date: item.date,
    }))
  );
  if (error) console.error('Error migrating reviews:', error);
  else console.log(`Migrated ${exhibitionReviews.length} reviews.`);
}

async function migrateNews() {
  console.log('Migrating News...');
  const { error } = await supabase.from('news').upsert(
    newsArticles.map((item) => ({
      id: item.id,
      title: item.title,
      source: item.source,
      date: item.date,
      link: item.link,
      thumbnail: item.thumbnail,
      description: item.description,
    }))
  );
  if (error) console.error('Error migrating news:', error);
  else console.log(`Migrated ${newsArticles.length} news articles.`);
}

async function migrateFAQ() {
  console.log('Migrating FAQ...');
  // Delete existing to avoid duplicates since no unique constraint on question
  await supabase.from('faq').delete().neq('question', '');
  const { error } = await supabase.from('faq').insert(
    faqs.map((item, index) => ({
      question: item.question,
      answer: item.answer,
      display_order: index,
    }))
  );
  if (error) console.error('Error migrating FAQ:', error);
  else console.log(`Migrated ${faqs.length} FAQs.`);
}

async function migrateTestimonials() {
  console.log('Migrating Testimonials...');

  // Clear existing testimonials to avoid duplicates
  const { error: clearError } = await supabase
    .from('testimonials')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (clearError) console.error('Error clearing testimonials:', clearError);

  let count = 0;
  for (const group of testimonials) {
    const { error } = await supabase.from('testimonials').insert(
      group.items.map((item, index) => ({
        category: group.category,
        quote: item.quote,
        author: item.author,
        context: item.context || '',
        display_order: index,
      }))
    );
    if (error) console.error('Error migrating testimonials:', error);
    else count += group.items.length;
  }
  console.log(`Migrated ${count} testimonials.`);
}

async function migrateVideos() {
  console.log('Migrating Videos...');
  const { error } = await supabase.from('videos').upsert(
    videos.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      youtube_id: item.youtubeId,
      thumbnail: item.thumbnail,
      transcript: item.transcript,
    }))
  );
  if (error) console.error('Error migrating videos:', error);
  else console.log(`Migrated ${videos.length} videos.`);
}

async function uploadImage(localPath, bucket, storagePath) {
  try {
    const fullPath = path.join(__dirname, '..', localPath);
    if (!fs.existsSync(fullPath)) return null;
    const fileBuffer = fs.readFileSync(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : 'application/octet-stream';
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, { upsert: true, contentType });
    if (error) throw error;
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return publicUrl;
  } catch (e) {
    // console.error(`   Upload failed for ${localPath}:`, e.message);
    return null;
  }
}

async function migrateAssets() {
  console.log('Migrating Assets...');
  const assetsRoot = path.join(__dirname, '..', 'public', 'images');
  if (!fs.existsSync(assetsRoot)) return;

  const files = getAllFiles(assetsRoot);
  let count = 0;

  for (const filePath of files) {
    const relativePath = path.relative(assetsRoot, filePath).replace(/\\/g, '/');
    if (relativePath.startsWith('artworks/')) continue;
    if (relativePath.startsWith('.')) continue;

    const localPath = path.join('public', 'images', relativePath);
    const storagePath = relativePath;
    const uploaded = await uploadImage(localPath, 'assets', storagePath);
    if (uploaded) count += 1;
  }

  console.log(`Migrated ${count} assets.`);
}

async function migrateArtistsAndArtworks() {
  console.log('Migrating Artists and Artworks...');

  // Clean start for artists and artworks
  await supabase.from('artworks').delete().neq('title', '');
  await supabase.from('artists').delete().neq('name_ko', '');

  const artistMap = new Map();
  const artistNames = Object.keys(ARTIST_DATA);

  for (const name of artistNames) {
    const data = ARTIST_DATA[name];
    const { data: artist, error } = await supabase
      .from('artists')
      .insert({
        name_ko: name,
        bio: data.profile || '',
        history: data.history || '',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('artists')
          .select('id')
          .eq('name_ko', name)
          .single();
        if (existing) artistMap.set(name, existing.id);
      } else {
        console.error(`Error inserting artist ${name}:`, error.message);
      }
    } else if (artist) {
      artistMap.set(name, artist.id);
    }
  }

  console.log('Migrating Artworks...');
  let artworkCount = 0;
  for (const artwork of artworks) {
    let artistId = artistMap.get(artwork.artist);
    if (!artistId) {
      const { data: existing } = await supabase
        .from('artists')
        .select('id')
        .eq('name_ko', artwork.artist)
        .single();
      if (existing) {
        artistId = existing.id;
        artistMap.set(artwork.artist, artistId);
      } else {
        const { data: newArtist, error } = await supabase
          .from('artists')
          .insert({ name_ko: artwork.artist })
          .select()
          .single();
        if (newArtist) {
          artistId = newArtist.id;
          artistMap.set(artwork.artist, artistId);
        } else {
          console.error(`Failed to create artist ${artwork.artist}:`, error?.message);
          continue;
        }
      }
    }

    const localImagePath = `public/images/artworks/${artwork.images[0]}`;
    const storagePath = `${artistId}/${artwork.images[0]}`;
    const publicUrl = await uploadImage(localImagePath, 'artworks', storagePath);
    const price =
      artwork.price !== undefined && artwork.price !== null ? String(artwork.price) : '';

    const { error: artworkError } = await supabase.from('artworks').insert({
      artist_id: artistId,
      title: artwork.title,
      description: artwork.description || '',
      size: artwork.size,
      material: artwork.material,
      year: artwork.year,
      edition: artwork.edition || '',
      price: price,
      status: artwork.sold ? 'sold' : 'available',
      is_hidden: artwork.hidden || false,
      images: publicUrl ? [publicUrl] : [],
      shop_url: artwork.shopUrl || '',
    });

    if (artworkError)
      console.error(`Error inserting artwork ${artwork.title}:`, artworkError.message);
    else artworkCount++;
  }
  console.log(`Migrated ${artworkCount} artworks.`);
}

async function main() {
  if (process.env.MIGRATE_ASSETS_ONLY === '1') {
    await migrateAssets();
    console.log('Assets Migration Complete.');
    return;
  }
  await migrateAssets();
  await migrateNews();
  await migrateFAQ();
  await migrateTestimonials();
  await migrateVideos();
  await migrateArtistsAndArtworks();
  await migrateReviews();
  console.log('Migration Complete.');
}

main().catch(console.error);
