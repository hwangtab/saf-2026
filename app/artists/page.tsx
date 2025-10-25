import type { Metadata } from 'next';
import PageHero from '@/components/ui/PageHero';
import { artists } from '@/content/artists';

export const metadata: Metadata = {
  title: '참여 예술가 | 씨앗:페 2026',
  description:
    '씨앗:페 2026에 참여하는 뮤지션, 화가, 무용가 등 다양한 예술인들을 소개합니다.',
  openGraph: {
    title: '참여 예술가 | 씨앗:페 2026',
    description:
      '씨앗:페 2026에 참여하는 뮤지션, 화가, 무용가 등 다양한 예술인들을 소개합니다.',
    url: 'https://saf2026.org/artists',
    images: ['/images/og-image.png'],
  },
};

export default function ArtistsPage() {
  const musicians = artists.filter((a) => a.role === 'musician');
  const visualArtists = artists.filter((a) => a.role === 'artist');

  return (
    <>
      <PageHero
        title="참여 예술가"
        description="씨앗:페 2026에 함께하는 예술인들의 목록"
      />

      {/* Musicians Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12"><span aria-hidden="true">🎵</span> 뮤지션 ({musicians.length}명)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {musicians.map((artist) => (
              <div
                key={artist.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl" aria-hidden="true">🎤</span>
                </div>
                <h3 className="font-bold text-sm text-center line-clamp-2">
                  {artist.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Artists Section */}
      <section className="py-12 md:py-20 bg-gray-50">
        <div className="container-max">
          <h2 className="text-3xl font-bold mb-12"><span aria-hidden="true">🎨</span> 미술작가 ({visualArtists.length}명)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visualArtists.map((artist) => (
              <div
                key={artist.id}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl" aria-hidden="true">🖼️</span>
                </div>
                <h3 className="font-bold text-sm text-center line-clamp-2">
                  {artist.name}
                </h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 md:py-20">
        <div className="container-max">
          <div className="bg-primary/5 rounded-lg p-8 border border-primary/20">
            <h2 className="text-2xl font-bold mb-4">참여 예술가 추가 안내</h2>
            <p className="text-gray-600 mb-4">
              위 목록은 확정된 참여 예술인들입니다. 행사에 가까워질수록 추가 참여 예술인과 공연 스케줄이 공개될 예정입니다.
            </p>
            <p className="text-gray-600">
              2023년 씨앗:페의 성공적인 개최 이후, 더 많은 예술인들이 이 운동에 동참하고 있습니다.
            </p>
          </div>
        </div>
      </section>

      {/* Gallery Link */}
      <section className="py-12 md:py-20 bg-primary/5">
        <div className="container-max text-center">
          <h2 className="text-3xl font-bold mb-8">작품 감상하기</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            참여 예술가들의 작품을 온라인 갤러리에서 만나보세요.
            구매를 통해 직접 예술인을 지원할 수 있습니다.
          </p>
          <a
            href="https://auto-graph.co.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-primary hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-lg transition-colors"
          >
            온라인 갤러리 방문
          </a>
        </div>
      </section>
    </>
  );
}
