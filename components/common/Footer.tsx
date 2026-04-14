import { getLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import ExportedImage from 'next-image-export-optimizer';
import { SOCIAL_LINKS, CONTACT, EXTERNAL_LINKS } from '@/lib/constants';
import FooterSliderWrapper from '@/components/common/FooterSliderWrapper';
import SawtoothDivider from '@/components/ui/SawtoothDivider';

export default async function Footer() {
  const t = await getTranslations('footer');
  const tNav = await getTranslations('nav');
  const tA11y = await getTranslations('a11y');
  const locale = await getLocale();
  const isEn = locale === 'en';

  return (
    <>
      <FooterSliderWrapper />
      <div className="relative">
        <SawtoothDivider position="top" colorClass="text-charcoal-deep" />
        <footer className="bg-charcoal-deep text-white pb-[env(safe-area-inset-bottom)]">
          <div className="container-max py-12">
            {/* Footer Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Organization Info with Logo */}
              <div>
                <Link href="/" className="flex items-start gap-3 mb-6 inline-flex">
                  <ExportedImage
                    src="/images/logo/320pxX90px_feet.webp"
                    alt={tA11y('logoAlt')}
                    width={200}
                    height={56}
                    className="h-12 w-auto flex-shrink-0"
                  />
                  <span className="sr-only">{tA11y('homeLink')}</span>
                </Link>
                <p className="text-gray-300 text-sm mb-4">{t('description')}</p>
                <p className="text-sm text-gray-400">{t('guide')}</p>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="font-sans font-bold text-lg mb-4">{t('links')}</h3>
                <ul className="space-y-2 text-sm">
                  {/* 내부 링크: 출품작 페이지 — SEO 내부 링크 에쿼티 전달 */}
                  <li>
                    <Link
                      href="/artworks"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('buyArt')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/our-reality"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('ourReality')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/our-proof"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('ourProof')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/transparency"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('transparency')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/news"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('news')}
                    </Link>
                  </li>
                  <li>
                    <a
                      href={EXTERNAL_LINKS.JOIN_MEMBER}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('donate')}
                    </a>
                  </li>
                  <li>
                    <a
                      href={EXTERNAL_LINKS.ONLINE_GALLERY}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {t('onlineGallery')}
                    </a>
                  </li>
                  <li>
                    <a
                      href={EXTERNAL_LINKS.LOAN_INFO}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {t('loanInfo')}
                    </a>
                  </li>
                  <li>
                    <a
                      href={EXTERNAL_LINKS.KOSMART_HOME}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {t('coopHome')}
                    </a>
                  </li>
                  <li>
                    <Link
                      href="/orders"
                      className="text-gray-300 hover:text-primary transition-colors"
                    >
                      {tNav('orderStatus')}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Social Links & Contact */}
              <div>
                <h3 className="font-sans font-bold text-lg mb-4">{t('follow')}</h3>
                <div className="flex gap-4 mb-6">
                  <a
                    href={SOCIAL_LINKS.INSTAGRAM}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-primary transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2"
                    aria-label="Instagram"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.266.069 1.646.069 4.85 0 3.204-.012 3.584-.07 4.85-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.322a1.44 1.44 0 110-2.881 1.44 1.44 0 010 2.881z" />
                    </svg>
                  </a>
                  <a
                    href={SOCIAL_LINKS.FACEBOOK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-primary transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Facebook"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                  <a
                    href={SOCIAL_LINKS.YOUTUBE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-300 hover:text-primary transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="YouTube"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                </div>

                <h3 className="font-sans font-bold text-lg mb-4">{t('contact')}</h3>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>
                    <a
                      href={`tel:${CONTACT.PHONE.replace(/-/g, '')}`}
                      className="hover:text-primary transition-colors link-underline-offset"
                    >
                      {CONTACT.PHONE}
                    </a>
                  </p>
                  <p>
                    <a
                      href={`mailto:${CONTACT.EMAIL}`}
                      className="hover:text-primary transition-colors link-underline-offset"
                    >
                      {CONTACT.EMAIL}
                    </a>
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 pt-8">
              <div className="text-center text-xs text-gray-400 leading-6 mb-4">
                <p>
                  {t('businessInfo', {
                    org: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME,
                    rep: CONTACT.REPRESENTATIVE_NAME,
                    bizNo: CONTACT.BUSINESS_REGISTRATION_NUMBER,
                  })}
                </p>
                <p>
                  {t('addressInfo', {
                    address: isEn ? CONTACT.ADDRESS_EN : CONTACT.ADDRESS,
                    postalCode: CONTACT.POSTAL_CODE,
                    mailOrder: CONTACT.MAIL_ORDER_REPORT_NUMBER,
                  })}
                </p>
              </div>
              <div className="mb-4 flex items-center justify-center gap-2 text-sm text-gray-300">
                <Link
                  href="/privacy"
                  className="hover:text-primary transition-colors link-underline-offset"
                >
                  {t('privacyPolicy')}
                </Link>
                <span className="text-gray-500" aria-hidden="true">
                  |
                </span>
                <Link
                  href="/terms"
                  className="hover:text-primary transition-colors link-underline-offset"
                >
                  {t('termsOfService')}
                </Link>
              </div>
              {/* Copyright */}
              <div className="text-center text-sm text-gray-400">
                <p>{t('copyright')}</p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
