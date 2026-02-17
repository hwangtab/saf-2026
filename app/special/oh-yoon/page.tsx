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
    <div className="w-full bg-[#fdfbf7] min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 px-4 overflow-hidden border-b-4 border-charcoal/10 bg-canvas-soft">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-2 mb-6 border-2 border-charcoal/80 bg-brand-orange/10 text-brand-orange font-bold rounded-full tracking-wider transform -rotate-2">
            오윤 40주기 특별전
          </span>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight text-charcoal tracking-tight break-keep">
            40년 만에 돌아온
            <br />
            <span className="text-brand-orange">민중의 칼날</span>, 다시
            <br />
            신명을 깨우다
          </h1>
          <p className="text-xl md:text-2xl text-charcoal/70 max-w-2xl mx-auto font-medium leading-relaxed">
            짧지만 강렬했던 삶, 판화로 새긴 시대의 정신.
            <br />
            오윤의 예술혼이 오늘 우리에게 다시 말을 겁니다.
          </p>
        </div>

        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-charcoal/10 opacity-50" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-charcoal/10 opacity-50" />
      </section>

      <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24">
        {/* Quote Section */}
        <div className="mb-24 flex justify-center">
          <blockquote className="relative p-8 md:p-12 text-center max-w-3xl border-y-2 border-charcoal/10 bg-white/50">
            <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-6xl text-brand-blue/20">
              &quot;
            </span>
            <p className="text-2xl md:text-4xl font-bold text-charcoal leading-relaxed word-keep">
              미술은 많은 사람이
              <br className="md:hidden" /> 나누어야 한다
            </p>
            <footer className="mt-6 text-lg text-charcoal/60 font-medium">— 오윤</footer>
          </blockquote>
        </div>

        {/* Bio / Narrative Section */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-24 mb-32 items-start">
          <div className="space-y-8">
            <h2 className="text-3xl font-bold border-l-8 border-brand-orange pl-6 py-2">
              시대의 아픔을
              <br />
              희망으로 새기다
            </h2>
            <div className="prose prose-lg text-charcoal/80 leading-loose space-y-4">
              <p>
                오윤(1946-1986)은 한국 민중미술을 대표하는 작가입니다. 그는 예술이 소수의 전유물이
                아니라, 동시대 사람들의 삶과 애환을 함께 나누는 마당이 되어야 한다고 믿었습니다.
              </p>
              <p>
                짧은 생애 동안 그는 목판화라는 가장 투박하고 정직한 매체를 통해 우리네 이웃의 얼굴,
                노동의 현장, 그리고 민중의 신명나는 춤사위를 담아냈습니다. 그의 칼끝에서 피어난
                선들은 때로는 날카롭게 시대의 어둠을 베고, 때로는 부드럽게 상처받은 마음들을
                어루만집니다.
              </p>
            </div>
          </div>

          <div className="bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-charcoal/5">
            <h3 className="text-xl font-bold text-brand-blue mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-blue" />
              주요 테마
            </h3>

            <ul className="space-y-6">
              <li className="flex gap-4 items-start">
                <span className="shrink-0 font-bold text-charcoal text-lg mt-1 min-w-[3rem]">
                  01.
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-lg mb-1">현실 (Reality)</h4>
                  <p className="text-charcoal/70 leading-relaxed">
                    구체적인 삶의 현장과 그 속에서 살아가는 사람들의 모습을 가감 없이 기록했습니다.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className="shrink-0 font-bold text-charcoal text-lg mt-1 min-w-[3rem]">
                  02.
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-lg mb-1">한 (Han)</h4>
                  <p className="text-charcoal/70 leading-relaxed">
                    민중의 가슴 속에 맺힌 한을 예술적 승화로 풀어내어, 슬픔을 넘어선 생명력을
                    표현했습니다.
                  </p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <span className="shrink-0 font-bold text-charcoal text-lg mt-1 min-w-[3rem]">
                  03.
                </span>
                <div>
                  <h4 className="font-bold text-charcoal text-lg mb-1">함께하는 미술</h4>
                  <p className="text-charcoal/70 leading-relaxed">
                    미술관을 넘어, 거리와 현장에서 사람들과 직접 소통하며 예술의 사회적 가치를
                    실천했습니다.
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Gallery Section Header */}
        <div className="mb-12 border-b border-charcoal/10 pb-6 flex flex-col md:flex-row justify-between items-end gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-2">전시 작품</h2>
            <p className="text-charcoal/60">
              총 {ohYoonArtworks.length}점의 작품이 전시되어 있습니다.
            </p>
          </div>
        </div>

        <div className="py-12">
          <MasonryGallery artworks={ohYoonArtworks} />
        </div>
      </div>
    </div>
  );
}
