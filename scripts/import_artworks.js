const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../content/artworks.csv'); // Using the temp file name I copied to
const OUT_PATH = path.join(__dirname, '../content/saf2026-artworks.ts');

function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuote) {
            if (char === '"' && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                inQuote = false;
            } else {
                currentField += char;
            }
        } else {
            if (char === '"') {
                inQuote = true;
            } else if (char === ',') {
                currentRow.push(currentField.trim());
                currentField = '';
            } else if (char === '\n' || char === '\r') {
                if (currentField || currentRow.length > 0) {
                    currentRow.push(currentField.trim());
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
                // Handle CRLF
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentField += char;
            }
        }
    }
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }
    return rows;
}

function processData() {
    try {
        // Read both CSV files
        const csv1Content = fs.readFileSync(path.join(__dirname, '../data_import.csv'), 'utf8');
        const csv2Content = fs.readFileSync('/Users/hwang-gyeongha/Downloads/추가 씨앗페 작가 - 시트1.csv', 'utf8');

        const rows1 = parseCSV(csv1Content);
        const rows2 = parseCSV(csv2Content);

        // 첫 번째 파일 헤더: 이름,이미지,작품명,크기,재료,년도,에디션 넘버,가격,프로필,작가노트,이미지파일명
        // Index: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

        // 두 번째 파일 헤더: 판매여부,이름,이미지,작품명,크기,재료,년도,에디션 넘버,가격,프로필,작가노트,작가 이력,이미지파일명
        // Index: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

        // Skip headers
        const dataRows1 = rows1.slice(1);
        const dataRows2 = rows2.slice(1);

        const artworks = [];

        // Process first CSV (existing format)
        dataRows1.forEach(row => {
            if (row.length < 2) return;

            const artist = row[0];
            let title = row[2];
            if (!title || title.trim() === '') {
                title = '작품명 확인 중';
            }
            const size = row[3] || '확인 중';
            const material = row[4] || '확인 중';
            const year = row[5] || '확인 중';
            const edition = row[6] || '';
            let price = row[7];
            const profile = row[8];
            const description = row[9];
            const imageFilename = row[10];

            if (!imageFilename) return; // Skip if no image file ID

            if (!price) {
                price = '문의';
            }

            // Detect actual file extension
            const imageDir = path.join(__dirname, '../public/images/artworks');
            let actualExtension = '.jpg'; // default
            const possibleExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
            for (const ext of possibleExtensions) {
                if (fs.existsSync(path.join(imageDir, `${imageFilename}${ext}`))) {
                    actualExtension = ext;
                    break;
                }
            }

            artworks.push({
                id: imageFilename,
                artist,
                title,
                description: description || '',
                profile: profile || '',
                size,
                material,
                year,
                edition,
                price,
                image: `${imageFilename}${actualExtension}`,
            });
        });

        // Process second CSV (new format with extra columns)
        dataRows2.forEach(row => {
            if (row.length < 2) return;

            const artist = row[1]; // 이름 column is at index 1
            let title = row[3];    // 작품명 at index 3
            if (!title || title.trim() === '') {
                title = '작품명 확인 중';
            }
            const size = row[4] || '확인 중';
            const material = row[5] || '확인 중';
            const year = row[6] || '확인 중';
            const edition = row[7] || '';
            let price = row[8];
            const profile = row[9];
            const description = row[10];
            const imageFilename = row[12]; // 이미지파일명 at index 12

            if (!imageFilename) return; // Skip if no image file ID

            if (!price) {
                price = '문의';
            }

            // Detect actual file extension
            const imageDir = path.join(__dirname, '../public/images/artworks');
            let actualExtension = '.jpg'; // default
            const possibleExtensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
            for (const ext of possibleExtensions) {
                if (fs.existsSync(path.join(imageDir, `${imageFilename}${ext}`))) {
                    actualExtension = ext;
                    break;
                }
            }

            artworks.push({
                id: imageFilename,
                artist,
                title,
                description: description || '',
                profile: profile || '',
                size,
                material,
                year,
                edition,
                price,
                image: `${imageFilename}${actualExtension}`,
            });
        });

        // Generate TS File
        const fileContent = `export interface Artwork {
  id: string;
  artist: string;
  title: string;
  description: string; // 작가 노트
  profile?: string; // 작가 프로필
  size: string; // 크기
  material: string; // 재료
  year: string; // 년도
  edition: string; // 에디션 넘버 (빈 문자열이면 원본)
  price: string;
  image: string; // 이미지 파일명
}

export const artworks: Artwork[] = ${JSON.stringify(artworks, null, 2)};

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find((artwork) => artwork.id === id);
}

export function getAllArtworks(): Artwork[] {
  return artworks;
}
`;

        fs.writeFileSync(OUT_PATH, fileContent);
        console.log(`Successfully generated ${artworks.length} artworks in ${OUT_PATH}`);

    } catch (error) {
        console.error('Error processing CSV:', error);
    }
}

function getCategoryFromMaterial(material) {
    if (!material) return 'Etc';
    const m = material.toLowerCase();
    if (m.includes('canvas') || m.includes('oil') || m.includes('acrylic') || m.includes('watercolor')) return 'Painting';
    if (m.includes('print') || m.includes('photo') || m.includes('pigment')) return 'Photography/Print';
    if (m.includes('sculpture') || m.includes('wood') || m.includes('steel')) return 'Sculpture';
    return 'Mixed Media';
}

processData();
