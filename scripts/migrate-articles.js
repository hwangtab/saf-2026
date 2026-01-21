const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CONFIG = {
  MD_PATH: path.join(process.cwd(), 'docs/missing-artist-resources.md'),
  TS_PATH: path.join(process.cwd(), 'content/artist-articles.ts'),
  LOG_PATH: path.join(process.cwd(), 'scripts/excluded-urls.log'),
  CONCURRENT_REQUESTS: 5,
  REQUEST_TIMEOUT: 10000,
  USER_AGENT:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  MAX_DESC_LEN: 200,
};

const excludedUrls = [];

function logExcluded(url, artist, reason) {
  excludedUrls.push(`[${reason}] ${url} (Artist: ${artist})`);
}

function parseMdFile() {
  console.log('📄 Parsing MD file...');
  const content = fs.readFileSync(CONFIG.MD_PATH, 'utf8');
  const lines = content.split('\n');
  const artists = [];

  let parsing = false;
  for (const line of lines) {
    if (line.includes('| Artist ID')) {
      parsing = true;
      continue;
    }
    if (line.includes('| :---')) continue;
    if (!parsing) continue;
    if (!line.trim() || line.startsWith('##')) {
      if (line.includes('조사 대기')) parsing = false;
      continue;
    }

    const parts = line
      .split('|')
      .map((s) => s.trim())
      .filter((s) => s);
    if (parts.length < 3) continue;

    const name = parts[1];
    const resourcesStr = parts[2];

    const resourceItems = resourcesStr.split('<br>').map((r) => r.trim());
    const articles = [];

    for (const res of resourceItems) {
      const match = res.match(/-\[(.*?)\]\((.*?)\)\s*-\s*(.*)/);

      if (match) {
        let title = match[1]
          .replace(/&#39;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&');

        let url = match[2];
        let source = match[3].replace(/<.*?>/g, '').trim();

        articles.push({ url, title, source });
      }
    }

    if (articles.length > 0) {
      artists.push({ name, articles });
    }
  }

  console.log(`   Found ${artists.length} artists to process.`);
  return artists;
}

async function fetchDescription(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': CONFIG.USER_AGENT },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let desc =
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content');

    if (!desc) {
      $('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50) {
          desc = text;
          return false;
        }
      });
    }

    if (desc) {
      desc = desc.replace(/\s+/g, ' ').trim();
      if (desc.length > CONFIG.MAX_DESC_LEN) {
        desc = desc.substring(0, CONFIG.MAX_DESC_LEN) + '...';
      }
      return desc;
    }

    return null;
  } catch (error) {
    throw error;
  }
}

async function main() {
  console.log('🚀 Migration started...');

  const artists = parseMdFile();
  const validArtists = [];

  let totalUrls = artists.reduce((sum, a) => sum + a.articles.length, 0);
  let processed = 0;

  console.log(`🌐 Validating ${totalUrls} URLs...`);

  for (const artist of artists) {
    const validArticles = [];

    const results = await Promise.allSettled(
      artist.articles.map(async (article) => {
        try {
          const desc = await fetchDescription(article.url);
          return {
            ...article,
            description: desc || article.title,
          };
        } catch (error) {
          logExcluded(article.url, artist.name, error.message || 'Error');
          return null;
        }
      })
    );

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        validArticles.push(res.value);
      }
      processed++;
      if (processed % 10 === 0) process.stdout.write(`   Progress: ${processed}/${totalUrls}\r`);
    }

    if (validArticles.length > 0) {
      validArtists.push({ name: artist.name, articles: validArticles });
    } else {
      console.log(`\n⚠️  Skipping artist "${artist.name}": All URLs invalid.`);
    }
  }

  console.log('\n\n📝 Generating TypeScript code...');

  let tsContent = fs.readFileSync(CONFIG.TS_PATH, 'utf8');

  const existingKeysMatch = tsContent.match(/^\s*([가-힣a-zA-Z0-9_]+): \[\s*$/gm);
  const existingKeys = existingKeysMatch
    ? existingKeysMatch.map((k) => k.split(':')[0].trim())
    : [];

  let newCode = '';
  let addedCount = 0;

  for (const artist of validArtists) {
    if (existingKeys.includes(artist.name) || tsContent.includes(`  ${artist.name}: [`)) {
      console.log(`   Skipping existing artist: ${artist.name}`);
      continue;
    }

    newCode += `  ${artist.name}: [\n`;
    for (const art of artist.articles) {
      const titleSafe = art.title.replace(/'/g, "\\'");
      const descSafe = art.description.replace(/'/g, "\\'");

      newCode += `    {\n`;
      newCode += `      url: '${art.url}',\n`;
      newCode += `      title: '${titleSafe}',\n`;
      newCode += `      description: '${descSafe}',\n`;
      newCode += `      source: '${art.source}',\n`;
      newCode += `    },\n`;
    }
    newCode += `  ],\n`;
    addedCount++;
  }

  if (addedCount > 0) {
    const insertPoint = tsContent.lastIndexOf('};');
    const finalContent = tsContent.slice(0, insertPoint) + newCode + tsContent.slice(insertPoint);
    fs.writeFileSync(CONFIG.TS_PATH, finalContent);
    console.log(`💾 Updated artist-articles.ts (Added ${addedCount} artists)`);
  } else {
    console.log('ℹ️  No new artists added.');
  }

  if (excludedUrls.length > 0) {
    const logHeader = `# Excluded URLs Log - ${new Date().toISOString()}\n\n`;
    fs.writeFileSync(CONFIG.LOG_PATH, logHeader + excludedUrls.join('\n'));
    console.log(`📋 Excluded URLs saved to ${CONFIG.LOG_PATH} (${excludedUrls.length} urls)`);
  }

  console.log('✅ Migration completed!');
}

main();
