import { getSupabaseArtworks, getSupabaseArtworkById } from '@/lib/supabase-data';
import Section from '@/components/ui/Section';
import { getArticlesByArtist } from '@/content/artist-articles';
import ArtworkImage from '@/components/features/ArtworkImage';
import BackToListButton from '@/components/features/BackToListButton';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { parsePrice } from '@/lib/parsePrice';
import { SITE_URL } from '@/lib/constants';
import LinkButton from '@/components/ui/LinkButton';
import RelatedArticles from '@/components/features/RelatedArticles';
import ExpandableHistory from '@/components/features/ExpandableHistory';
import {
  generateArtworkMetadata,
  generateArtworkJsonLd,
  generateSpeakableSchema,
} from '@/lib/seo-utils';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import ShareButtons from '@/components/common/ShareButtons';
import SupportMessage from '@/components/features/SupportMessage';
import PurchaseGuide from '@/components/features/PurchaseGuide';
import TrustBadges from '@/components/features/TrustBadges';
import Link from 'next/link';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface Props {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    returnTo?: string;
  }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artwork = await getSupabaseArtworkById(id);

  if (!artwork) {
    return {
      title: '작품을 찾을 수 없습니다',
    };
  }

  return generateArtworkMetadata(artwork);
}

// Generate static params for all artworks at build time
export async function generateStaticParams() {
  const artworks = await getSupabaseArtworks();
  return artworks.map((artwork) => ({
    id: artwork.id,
  }));
}

export default async function ArtworkDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const normalizedReturnTo = returnTo === '/special/oh-yoon' ? returnTo : undefined;
  const listHref = normalizedReturnTo ?? '/artworks';
  const listLabel = normalizedReturnTo ? '오윤 특별전' : '출품작';
  const [artwork, artworks] = await Promise.all([
    getSupabaseArtworkById(id),
    getSupabaseArtworks(),
  ]);

  if (!artwork) {
    notFound();
  }

  // Extract numeric price using utility
  const parsedPrice = parsePrice(artwork.price);
  const isInquiry = parsedPrice === Infinity;
  const numericPrice = isInquiry ? '0' : String(parsedPrice);

  // Get related articles for this artist
  const relatedArticles = getArticlesByArtist(artwork.artist);

  // Generate JSON-LD schemas
  const { productSchema, breadcrumbSchema } = generateArtworkJsonLd(
    artwork,
    numericPrice,
    isInquiry
  );

  const speakableSchema = generateSpeakableSchema([
    '#artwork-title',
    '#artist-name',
    '#artist-profile',
    '#artist-note',
  ]);

  const otherWorks = artworks
    .filter((a) => a.artist === artwork.artist && a.id !== artwork.id)
    .slice(0, 3);

  return (
    <>
      <JsonLdScript data={[productSchema, breadcrumbSchema, speakableSchema]} />
      <Section
        variant="white"
        prevVariant="canvas-soft"
        padding="none"
        className="pb-24 md:pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))]"
      >
        {/* Navigation Bar */}
        <nav className="border-b sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/50">
          <div className="container-max py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <BackToListButton fallbackHref={listHref} />

            {/* Visual Breadcrumbs for SEO & UX */}
            <div className="flex items-center text-xs text-gray-400 gap-2 whitespace-nowrap overflow-x-auto pb-1 md:pb-0">
              <Link href="/" className="hover:text-primary transition-colors">
                홈
              </Link>
              <span>/</span>
              <Link href={listHref} className="hover:text-primary transition-colors">
                {listLabel}
              </Link>
              <span>/</span>
              <Link
                href={`/artworks/artist/${encodeURIComponent(artwork.artist)}`}
                className="hover:text-primary transition-colors"
              >
                {artwork.artist}
              </Link>
              <span className="hidden sm:inline">/</span>
              <span className="hidden sm:inline text-gray-600 font-medium truncate max-w-[150px]">
                {artwork.title}
              </span>
            </div>
          </div>
        </nav>

        <article className="container-max pt-12 md:pt-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Column: Image & CTA */}
            <div className="space-y-8">
              <ArtworkImage
                images={artwork.images}
                title={artwork.title}
                artist={artwork.artist}
                sold={artwork.sold}
              />

              {/* Mobile Header: Title, Artist, Price (Visible only on mobile) */}
              <div className="block lg:hidden space-y-3 mt-6">
                <h1
                  id="artwork-title-mobile"
                  className="text-2xl font-bold font-sans text-charcoal break-keep text-center"
                >
                  {artwork.title}
                </h1>
                <div className="flex flex-col items-center gap-1">
                  <p id="artist-name-mobile" className="text-lg text-gray-600 font-medium">
                    {artwork.artist}
                  </p>
                  {artwork.price && (
                    <p className="text-xl font-bold text-charcoal">{artwork.price}</p>
                  )}
                </div>
              </div>

              {/* Share Section */}
              <div className="flex items-center justify-center gap-2 py-4 border-y border-gray-100">
                <span className="text-sm text-gray-500 mr-2">공유하기</span>
                <ShareButtons
                  url={`${SITE_URL}/artworks/${artwork.id}`}
                  title={`${artwork.title} - ${artwork.artist} | 씨앗페 2026 출품작`}
                  description={`${artwork.artist}의 작품 "${artwork.title}"을 감상하고 예술인을 응원하세요.`}
                />
              </div>

              {/* CTA Section - Moved here for better visibility */}
              <div className="space-y-6">
                {/* 온라인 구매 버튼 - 가격이 있고, shopUrl이 있고, 판매되지 않은 경우에만 표시 */}
                {artwork.price && artwork.price !== '문의' && artwork.shopUrl && !artwork.sold && (
                  <>
                    {/* Purchase Guide */}
                    <PurchaseGuide className="mb-4" />

                    <LinkButton
                      href={artwork.shopUrl}
                      variant="primary"
                      size="lg"
                      external
                      className="w-full text-lg gap-3 rounded-xl"
                    >
                      온라인 구매
                    </LinkButton>

                    {/* 구분선 */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-gray-400 text-sm">또는 직접 문의</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>
                  </>
                )}

                {/* 구매 링크가 없는 경우 - 안내 문구 표시 */}
                {artwork.price && artwork.price !== '문의' && !artwork.shopUrl && !artwork.sold && (
                  <>
                    {/* 1. 배송/결제 안내 (일반적인 정보) - 상단 분리 */
                    /* 디자인 통일을 위해 bg-transparent 제거하여 회색 박스 형태 복구 */}
                    <PurchaseGuide className="mb-6" />

                    {/* 2. 구매 문의 CTA 섹션 */
                    /* 위쪽 PurchaseGuide(회색)와 구분되도록 배경을 흰색으로 변경하고 테두리 강조 */}
                    <div className="bg-white rounded-xl p-6 mb-6 text-center border border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-charcoal mb-4">
                        작품 구매를 원하시나요?
                      </h3>

                      {/* 구매 절차 시각화 */}
                      <div className="flex justify-center items-center gap-2 text-xs text-gray-500 mb-6">
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-primary shadow-sm">
                            1
                          </span>
                          <span>구매 문의</span>
                        </div>
                        <div className="w-12 h-px bg-gray-300 mb-4"></div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                            2
                          </span>
                          <span>결제 안내</span>
                        </div>
                        <div className="w-12 h-px bg-gray-300 mb-4"></div>
                        <div className="flex flex-col items-center gap-2">
                          <span className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-400 shadow-sm">
                            3
                          </span>
                          <span>작품 배송</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-0 word-keep leading-relaxed">
                        현재 온라인 결제 시스템 연동 준비 중입니다.
                        <br />
                        <span className="font-semibold text-charcoal">아래 연락처</span>로
                        문의주시면
                        <br />
                        담당자가{' '}
                        <span className="text-primary font-medium">구매 절차 및 배송 일정</span>을
                        상세히 안내해 드립니다.
                      </p>
                    </div>
                  </>
                )}

                {/* 연락처 옵션 */}
                <div className="grid grid-cols-2 gap-4">
                  <LinkButton
                    href="tel:02-764-3114"
                    variant="accent"
                    leadingIcon="📞"
                    iconLayout="fixed-left"
                    iconClassName="grayscale group-hover:grayscale-0 transition-all"
                  >
                    <span className="text-sm font-bold text-center">02-764-3114</span>
                  </LinkButton>
                  <LinkButton
                    href="mailto:contact@kosmart.org"
                    variant="accent"
                    leadingIcon="✉️"
                    iconLayout="fixed-left"
                    iconClassName="grayscale group-hover:grayscale-0 transition-all"
                  >
                    <span className="text-sm font-bold text-center">이메일 문의</span>
                  </LinkButton>
                </div>

                {/* Campaign Support Message */}
                <SupportMessage className="mt-4" />
              </div>
            </div>

            {/* Right Column: Info Section */}
            <div className="space-y-8">
              <header className="hidden lg:block mb-6 border-b border-gray-100 pb-6 lg:border-none lg:pb-0 lg:mb-0">
                <h1
                  id="artwork-title"
                  className="text-3xl md:text-4xl font-bold font-sans text-charcoal mb-2 break-keep"
                >
                  {artwork.title}
                </h1>
                <p id="artist-name" className="text-xl text-gray-600 font-medium">
                  {artwork.artist}
                </p>
              </header>

              <TrustBadges className="mb-6" />

              <div className="border-t border-b border-gray-100 py-6">
                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-3 items-baseline">
                  {/* 재료 */}
                  {artwork.material && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">재료</span>
                      <span className="text-charcoal">{artwork.material}</span>
                    </>
                  )}

                  {/* 크기 */}
                  {artwork.size && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">크기</span>
                      <span className="text-charcoal">{artwork.size}</span>
                    </>
                  )}

                  {/* 년도 */}
                  {artwork.year && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">년도</span>
                      <span className="text-charcoal">{artwork.year}</span>
                    </>
                  )}

                  {/* 에디션 */}
                  {artwork.edition && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">에디션</span>
                      <span className="text-charcoal">{artwork.edition}</span>
                    </>
                  )}

                  {/* 가격 */}
                  {artwork.price && (
                    <>
                      <span className="text-gray-600 font-medium text-sm">가격</span>
                      <span className="text-charcoal font-semibold">{artwork.price}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Artist Profile (profile only, no history) */}
              {artwork.profile && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    작가 소개
                  </h3>
                  <p
                    id="artist-profile"
                    className="text-gray-700 leading-relaxed text-sm whitespace-pre-line"
                  >
                    {artwork.profile}
                  </p>
                </div>
              )}

              {/* Artist Note */}
              {artwork.description && (
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">
                    작가 노트
                  </h3>
                  <p
                    id="artist-note"
                    className="text-gray-700 leading-relaxed text-sm whitespace-pre-line"
                  >
                    {artwork.description}
                  </p>
                </div>
              )}

              {/* Artist History - separate card, below artist note */}
              {artwork.history && <ExpandableHistory history={artwork.history} />}

              {/* Related Articles */}
              <RelatedArticles articles={relatedArticles} />
            </div>
          </div>

          {/* Other Works by this Artist Section */}
          {otherWorks.length > 0 ? (
            <div className="mt-24 pt-24 border-t border-gray-100">
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-2xl font-bold text-charcoal">
                  {artwork.artist} 작가의 다른 작품
                </h2>
                <Link
                  href={`/artworks/artist/${encodeURIComponent(artwork.artist)}`}
                  className="text-primary font-medium hover:underline text-sm"
                >
                  전체보기 →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {otherWorks.map((other) => (
                  <ArtworkCard key={other.id} artwork={other} variant="gallery" />
                ))}
              </div>
            </div>
          ) : null}
        </article>
      </Section>
    </>
  );
}
