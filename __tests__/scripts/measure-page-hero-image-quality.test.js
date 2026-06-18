const path = require('path');

const {
  classifyDimensions,
  extractImageCandidates,
  localPublicPath,
} = require('../../scripts/measure-page-hero-image-quality');

describe('measure-page-hero-image-quality helpers', () => {
  it('long edge가 1920 미만이면 lowRes true', () => {
    expect(classifyDimensions(1200, 900)).toEqual({ width: 1200, height: 900, lowRes: true });
  });

  it('long edge가 1920 이상이면 lowRes false', () => {
    expect(classifyDimensions(1920, 1080)).toEqual({ width: 1920, height: 1080, lowRes: false });
  });

  it('로컬 public 이미지와 원격 이미지를 source에서 추출', () => {
    const source = `
      customBackgroundImage="/images/hero/3.jpg"
      thumbnail: 'https://example.com/news/photo.webp'
      other: '/not-an-image.txt'
    `;
    expect(extractImageCandidates(source)).toEqual([
      '/images/hero/3.jpg',
      'https://example.com/news/photo.webp',
    ]);
  });

  it('로컬 public URL을 public 디렉터리 파일 경로로 변환', () => {
    expect(localPublicPath('/images/hero/3.jpg')).toBe(
      path.join(process.cwd(), 'public', 'images', 'hero', '3.jpg')
    );
  });
});
