import type { Metadata } from 'next';
import { artworks } from '@/content/saf2026-artworks';
import MasonryGallery from '@/components/features/MasonryGallery';

export const metadata: Metadata = {
  title: '오윤 40주기 특별전: Oh Yoon 40th Anniversary Special Exhibition',
  description: '씨앗페 2026에서 진행하는 민중미술의 거장 오윤의 40주기 특별전입니다.',
};

export default function OhYoonPage() {
  const ohYoonArtworks = artworks.filter((a) => a.artist === '오윤');

  return (
    <div className="w-full bg-canvas-soft min-h-screen font-serif">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-8 border-double border-charcoal/20 bg-canvas">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block relative mb-8">
            <span className="relative z-10 inline-block px-6 py-3 border-4 border-charcoal bg-white text-charcoal font-bold text-lg tracking-widest transform -rotate-1 shadow-[4px_4px_0px_0px_rgba(49,57,60,0.2)]">
              오윤 40주기 특별전
            </span>
            <div className="absolute inset-0 border-4 border-brand-orange transform rotate-2 translate-x-1 translate-y-1 -z-0 opacity-60" />
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-10 leading-tight text-charcoal tracking-tighter break-keep drop-shadow-sm">
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

          <p className="text-xl md:text-2xl text-charcoal/80 max-w-2xl mx-auto font-medium leading-relaxed border-t-2 border-b-2 border-charcoal/10 py-6">
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
          <blockquote className="relative p-12 md:p-16 text-center max-w-4xl border-4 border-charcoal bg-white shadow-[8px_8px_0px_0px_rgba(49,57,60,0.1)]">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-brand-orange flex items-center justify-center rounded-full text-white font-serif text-3xl font-bold">
              &ldquo;
            </div>
            <p className="text-3xl md:text-5xl font-bold text-charcoal leading-relaxed word-keep pt-4">
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
            <h2 className="text-4xl font-bold border-l-[12px] border-charcoal pl-6 py-2 leading-tight">
              시대의 아픔을
              <br />
              <span className="text-brand-orange-strong">희망으로 새기다</span>
            </h2>
            <div className="prose prose-xl text-charcoal/90 leading-loose space-y-6 font-medium">
              <p>
                오윤(1946-1986)은 한국 민중미술을 대표하는 작가입니다. 그는 예술이 소수의 전유물이
                아니라, <span className="bg-brand-sun-soft px-1">동시대 사람들의 삶과 애환</span>을
                함께 나누는 마당이 되어야 한다고 믿었습니다.
              </p>
              <p>
                짧은 생애 동안 그는 목판화라는 가장 투박하고 정직한 매체를 통해 우리네 이웃의 얼굴,
                노동의 현장, 그리고 민중의 신명나는 춤사위를 담아냈습니다. 그의 칼끝에서 피어난
                선들은 때로는 날카롭게 시대의 어둠을 베고, 때로는 부드럽게 상처받은 마음들을
                어루만집니다.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-12 border-4 border-charcoal shadow-[8px_8px_0px_0px_rgba(247,152,36,0.3)]">
            <h3 className="text-2xl font-bold text-charcoal mb-8 flex items-center gap-3 border-b-2 border-charcoal pb-4">
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
                  <p className="text-charcoal/70 leading-relaxed text-lg">
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
                  <p className="text-charcoal/70 leading-relaxed text-lg">
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
                  <p className="text-charcoal/70 leading-relaxed text-lg">
                    미술관을 넘어, 거리와 현장에서 사람들과 직접 소통하며 예술의 사회적 가치를
                    실천했습니다.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Gallery Section Header */}
        <div className="mb-16 border-b-4 border-double border-charcoal/20 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-black mb-4 text-charcoal">전시 작품</h2>
            <div className="absolute -left-4 -top-4 text-6xl text-brand-orange/10 font-black -z-10">
              Artworks
            </div>
            <p className="text-lg text-charcoal/70 font-medium">
              총{' '}
              <span className="text-brand-orange-strong font-bold text-xl">
                {ohYoonArtworks.length}
              </span>
              점의 판화가 전시되어 있습니다.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-charcoal rounded-full" />
            <div className="w-3 h-3 bg-brand-orange rounded-full" />
            <div className="w-3 h-3 bg-brand-sun rounded-full" />
          </div>
        </div>

        <div className="py-12">
          <MasonryGallery artworks={ohYoonArtworks} />
        </div>
      </div>
    </div>
  );
}
