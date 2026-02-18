import type { Metadata } from 'next';
import Link from 'next/link';
import { artworks } from '@/content/saf2026-artworks';
import OhYoonMasonryGallery from '@/components/special/OhYoonMasonryGallery';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';

const OH_YOON_ARTIST_KEYS = new Set(['오윤', 'oh yoon', 'ohyoon', 'o yoon', 'o-yoon']);

const normalizeArtistKey = (value: string): string => value.normalize('NFC').trim().toLowerCase();

const normalizeArtistCompactKey = (value: string): string =>
  normalizeArtistKey(value).replace(/[\s-]+/g, '');

const isOhYoonArtist = (artist: string): boolean => {
  if (!artist) return false;

  const normalized = normalizeArtistKey(artist);
  const compact = normalizeArtistCompactKey(artist);

  return OH_YOON_ARTIST_KEYS.has(normalized) || compact === '오윤' || compact === 'ohyoon';
};

const OH_YOON_ARTWORKS = artworks.filter((artwork) => isOhYoonArtist(artwork.artist));

export const metadata: Metadata = {
  title: '오윤 40주기 특별전: Oh Yoon 40th Anniversary Special Exhibition',
  description: '씨앗페 2026에서 진행하는 민중미술의 거장 오윤의 40주기 특별전입니다.',
  alternates: {
    canonical: `${SITE_URL}/special/oh-yoon`,
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: `${SITE_URL}/special/oh-yoon`,
    title: '오윤 40주기 특별전: Oh Yoon 40th Anniversary Special Exhibition',
    description: '민중미술의 거장 오윤의 작품 세계를 만나는 온라인 특별전 페이지입니다.',
    siteName: '씨앗페 2026',
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: '오윤 40주기 특별전 대표 이미지',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '오윤 40주기 특별전',
    description: '민중미술의 거장 오윤의 작품 세계를 만나는 온라인 특별전',
    images: [OG_IMAGE.url],
  },
};

export default function OhYoonPage() {
  const artworkCountLabel = new Intl.NumberFormat('ko-KR').format(OH_YOON_ARTWORKS.length);

  return (
    <div className="w-full bg-canvas-soft min-h-screen font-sans">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-charcoal/20 bg-canvas">
        <div
          data-hero-sentinel="true"
          aria-hidden="true"
          className="absolute top-0 left-0 h-px w-px"
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block relative mb-8">
            <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
              오윤 40주기 특별전
            </span>
            <div className="absolute inset-0 border-4 border-brand-orange transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-normal mb-8 md:mb-10 leading-tight text-charcoal tracking-tighter text-balance drop-shadow-sm font-display">
            40년 만에 돌아온
            <br />
            <span className="relative inline-block px-2">
              <span className="relative z-10 text-brand-orange-strong">민중의 칼날</span>
              <span className="absolute bottom-2 left-0 w-full h-4 bg-charcoal/10 -z-0 -rotate-1" />
            </span>
            , 다시
            <br />
            신명을 깨우다
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-charcoal/90 max-w-2xl mx-auto font-medium leading-relaxed border-t-2 border-b-2 border-charcoal/15 py-5 md:py-6">
            짧지만 강렬했던 삶, 판화로 새긴 시대의 정신.
            <br />
            오윤의 예술혼이 오늘 우리에게 다시 말을 겁니다.
          </p>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-[12px] border-t-[12px] border-charcoal/10" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-[12px] border-b-[12px] border-charcoal/10" />
        <div className="absolute top-1/2 left-4 w-4 h-4 rounded-full bg-brand-orange opacity-40" />
        <div className="absolute top-1/3 right-8 w-6 h-6 rounded-full bg-charcoal opacity-10" />
      </section>

      <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
        {/* Quote Section */}
        <div className="mb-24 flex justify-center">
          <blockquote className="relative p-8 sm:p-10 md:p-16 text-center max-w-4xl border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)]">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-brand-orange flex items-center justify-center rounded-full text-white font-display text-3xl font-normal">
              &ldquo;
            </div>
            <p className="text-2xl sm:text-3xl md:text-5xl font-normal text-charcoal leading-relaxed text-balance pt-4 font-display">
              미술은 많은 사람이
              <br className="md:hidden" /> 나누어야 한다
            </p>
            <footer className="mt-8 flex items-center justify-center gap-2">
              <span className="h-px w-8 bg-charcoal/40"></span>
              <span className="text-xl text-charcoal font-bold tracking-widest">오윤</span>
              <span className="h-px w-8 bg-charcoal/40"></span>
            </footer>
          </blockquote>
        </div>

        {/* Bio / Narrative Section */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 mb-32 items-start">
          <div className="space-y-8">
            <h2 className="text-4xl font-normal border-l-[12px] border-charcoal pl-6 py-2 leading-tight font-display text-balance">
              시대의 아픔을
              <br />
              <span className="text-brand-orange-strong">희망으로 새기다</span>
            </h2>
            <div className="prose prose-xl text-charcoal/90 leading-loose space-y-6 font-medium">
              <p>
                오윤(1946-1986). 소설가 오영수의 아들로 태어났으나, 그는 문학적 언어 대신{' '}
                <strong className="font-bold text-charcoal bg-brand-sun-soft px-1">칼끝</strong>으로
                시대를 기록했습니다. 화려한 추상미술이 강단을 지배하던 시절, 그는 &quot;미술은
                썩어가는 현실을 도려내는 칼이어야 한다&quot;고 믿으며 가장 낮은 곳으로 향했습니다.
              </p>
              <p>
                그가 선택한 <strong className="font-bold text-charcoal">목판화</strong>는 단순한
                예술 형식이 아니었습니다. 그것은 한 번 칼을 대면 되돌릴 수 없는 결기였으며, 수만
                장을 찍어내어 공장 담벼락과 대학가, 시장통의 사람들과 나눌 수 있는 가장 민주적인
                그릇이었습니다.
              </p>
              <p>
                부산 가마골의 억센 웃음, 구로공단 노동자의 땀방울, 그리고 짓눌린 한(恨)을
                신명(神明)나는 춤사위로 풀어내는 민중의 생명력. 오윤의 칼자국은 투박하지만 정직하게
                이 모든 것을 나무에 새겼습니다. 마흔이라는 짧은 생을 마감했지만, 그가 남긴 선 굵은
                판화들은 여전히 우리 시대의 가장 아픈 곳을 어루만지며 &apos;함께 사는 삶&apos;을
                이야기하고 있습니다.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
            <h3 className="text-2xl font-normal text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4 font-display text-balance">
              <span className="w-4 h-4 bg-brand-orange rotate-45" />
              주요 테마
            </h3>

            <ul className="space-y-8">
              <li className="flex gap-6 items-start group">
                <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                  1
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-brand-orange-strong transition-colors">
                    현실 (Reality)
                  </h4>
                  <p className="text-charcoal/80 leading-relaxed text-lg">
                    구체적인 삶의 현장과 그 속에서 살아가는 사람들의 모습을 가감 없이 기록했습니다.
                  </p>
                </div>
              </li>
              <li className="flex gap-6 items-start group">
                <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                  2
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-brand-orange-strong transition-colors">
                    한 (Han)
                  </h4>
                  <p className="text-charcoal/80 leading-relaxed text-lg">
                    민중의 가슴 속에 맺힌 한을 예술적 승화로 풀어내어, 슬픔을 넘어선 생명력을
                    표현했습니다.
                  </p>
                </div>
              </li>
              <li className="flex gap-6 items-start group">
                <span className="shrink-0 flex items-center justify-center w-10 h-10 border-2 border-charcoal rounded-full font-bold text-charcoal text-lg group-hover:bg-charcoal group-hover:text-white transition-colors">
                  3
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-xl mb-2 group-hover:text-brand-orange-strong transition-colors">
                    함께하는 미술
                  </h4>
                  <p className="text-charcoal/80 leading-relaxed text-lg">
                    미술관을 넘어, 거리와 현장에서 사람들과 직접 소통하며 예술의 사회적 가치를
                    실천했습니다.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Gallery Section - The 40th Archive Theme */}
      <div className="relative py-20 bg-[#2a3032] text-white">
        {/* Section Header */}
        <div className="max-w-[1440px] mx-auto px-4 mb-16 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/20 pb-8">
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-normal mb-4 text-white font-display text-balance">
              전시 작품
            </h2>
            <div className="absolute -left-4 -top-6 text-[80px] text-white/5 font-normal -z-10 font-display select-none">
              ARCHIVE
            </div>
            <p className="text-base sm:text-lg text-white/70 font-medium">
              총 <span className="text-brand-orange font-bold text-xl">{artworkCountLabel}</span>
              점의 판화가 전시되어 있습니다.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-white/40 uppercase tracking-widest">
              Oh Yoon 40th Anniversary
            </span>
            <span className="text-sm text-white/60">작품을 클릭하여 상세 정보를 확인하세요</span>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="max-w-[1440px] mx-auto px-4">
          {OH_YOON_ARTWORKS.length > 0 ? (
            <OhYoonMasonryGallery artworks={OH_YOON_ARTWORKS} />
          ) : (
            <section className="py-24 text-center">
              <div className="inline-block rounded-xl border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-white text-balance mb-4">
                  작품 데이터 준비 중입니다
                </h3>
                <p className="text-white/60 text-balance mb-8">
                  현재 오윤 특별전 작품 정보를 정리하고 있습니다.
                  <br />
                  전체 출품작 목록에서 다른 작품들을 먼저 감상하실 수 있습니다.
                </p>
                <Link
                  href="/artworks"
                  className="inline-flex items-center justify-center px-6 py-3 border border-white/30 rounded text-white hover:bg-white hover:text-[#2a3032] transition-colors font-medium"
                >
                  전체 작품 보러 가기
                </Link>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
