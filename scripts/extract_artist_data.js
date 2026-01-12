const fs = require('fs');
const path = require('path');

const batchFiles = [
  'content/artworks-batches/batch-001.ts',
  'content/artworks-batches/batch-002.ts',
  'content/artworks-batches/batch-003.ts',
];

const artistData = {};

function extractData(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  const artworkRegex = /{\s*id:[\s\S]*?}/g;
  const artworks = content.match(artworkRegex) || [];

  artworks.forEach((artworkBlock) => {
    const artistMatch = artworkBlock.match(/artist:\s*'([^']*)'/);
    if (!artistMatch) return;

    const artist = artistMatch[1];

    let profile = '';
    const profileMatch = artworkBlock.match(/profile:\s*([\s\S]*?)(,\n|\n\s*})/);
    if (profileMatch) {
      let rawProfile = profileMatch[1].trim();
      if (rawProfile.startsWith("'") && rawProfile.endsWith("'")) {
        profile = rawProfile.slice(1, -1);
      } else if (rawProfile.startsWith('"') && rawProfile.endsWith('"')) {
        profile = rawProfile.slice(1, -1);
      } else if (rawProfile.startsWith('`') && rawProfile.endsWith('`')) {
        profile = rawProfile.slice(1, -1);
      } else if (rawProfile.startsWith("'") || rawProfile.startsWith('"')) {
        if (
          (rawProfile.startsWith("'") && rawProfile.endsWith("'")) ||
          (rawProfile.startsWith('"') && rawProfile.endsWith('"'))
        ) {
          profile = rawProfile.slice(1, -1);
        }
      }

      profile = profile.replace(/\\n/g, '\n');
    }

    let history = '';
    const historyMatch = artworkBlock.match(/history:\s*([\s\S]*?)(,\n|\n\s*})/);
    if (historyMatch) {
      let rawHistory = historyMatch[1].trim();
      if (
        (rawHistory.startsWith("'") && rawHistory.endsWith("'")) ||
        (rawHistory.startsWith('"') && rawHistory.endsWith('"')) ||
        (rawHistory.startsWith('`') && rawHistory.endsWith('`'))
      ) {
        history = rawHistory.slice(1, -1);
      }
      history = history.replace(/\\n/g, '\n');
    }

    if (!artistData[artist]) {
      artistData[artist] = { profile, history };
    } else {
      if (profile.length > artistData[artist].profile.length) {
        artistData[artist].profile = profile;
      }
      if (history.length > artistData[artist].history.length) {
        artistData[artist].history = history;
      }
    }
  });
}

batchFiles.forEach((file) => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    extractData(fullPath);
  }
});

let output = `export interface ArtistData {
  profile: string;
  history: string;
}

export const ARTIST_DATA: Record<string, ArtistData> = {
`;

Object.keys(artistData)
  .sort()
  .forEach((artist) => {
    const { profile, history } = artistData[artist];
    const safeProfile = profile.replace(/`/g, '\\`').replace(/\$/g, '\\$');
    const safeHistory = history.replace(/`/g, '\\`').replace(/\$/g, '\\$');

    output += `  '${artist}': {
    profile: \`${safeProfile}\`,
    history: \`${safeHistory}\`,
  },
`;
  });

output += `};\n`;

fs.writeFileSync(path.join(process.cwd(), 'content/artists-data.ts'), output);
console.log('Generated content/artists-data.ts');
