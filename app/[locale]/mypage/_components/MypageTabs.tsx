'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import clsx from 'clsx';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import OrdersTab from './OrdersTab';
import WishlistTab from './WishlistTab';
import ProfileTab from './ProfileTab';
import ArtistApplyTab from './ArtistApplyTab';
import ExhibitorApplyTab from './ExhibitorApplyTab';
import { SignOutButton } from '@/components/auth/SignOutButton';

type Tab = 'orders' | 'wishlist' | 'profile' | 'artist-apply' | 'exhibitor-apply';

type Order = {
  id: string;
  order_no: string;
  artwork_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer_name: string;
};

type Messages = {
  title: string;
  tabOrders: string;
  tabWishlist: string;
  tabProfile: string;
  tabArtistApply: string;
  tabExhibitorApply: string;
  ordersEmpty: string;
  ordersViewDetail: string;
  wishlistEmpty: string;
  wishlistBrowse: string;
  profileName: string;
  profileEmail: string;
  profilePhone: string;
  profilePhonePlaceholder: string;
  profileInvalidPhone: string;
  profileSave: string;
  profileSaved: string;
  profileMarketingConsent: string;
  profileMarketingConsentDesc: string;
  profileMarketingConsentSaved: string;
  artistApplyHeading: string;
  artistApplyBody: string;
  artistApplyCta: string;
  exhibitorApplyHeading: string;
  exhibitorApplyBody: string;
  exhibitorApplyCta: string;
};

interface MypageTabsProps {
  user: { id: string; email: string; name: string };
  initialOrders: Order[];
  initialWishlistIds: string[];
  showArtistApply: boolean;
  showExhibitorApply: boolean;
  initialMarketingConsent: boolean;
  initialPhone: string | null;
  messages: Messages;
}

export default function MypageTabs({
  user,
  initialOrders,
  initialWishlistIds,
  showArtistApply,
  showExhibitorApply,
  initialMarketingConsent,
  initialPhone,
  messages,
}: MypageTabsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const rawTab = searchParams.get('tab');
  const activeTab: Tab =
    rawTab === 'wishlist' || rawTab === 'profile'
      ? rawTab
      : rawTab === 'artist-apply' && showArtistApply
        ? 'artist-apply'
        : rawTab === 'exhibitor-apply' && showExhibitorApply
          ? 'exhibitor-apply'
          : 'orders';

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'orders', label: messages.tabOrders },
    { id: 'wishlist', label: messages.tabWishlist },
    { id: 'profile', label: messages.tabProfile },
    ...(showArtistApply ? [{ id: 'artist-apply' as const, label: messages.tabArtistApply }] : []),
    ...(showExhibitorApply
      ? [{ id: 'exhibitor-apply' as const, label: messages.tabExhibitorApply }]
      : []),
  ];

  return (
    <div className={`min-h-screen bg-canvas-soft pt-24 md:pt-28 ${SAWTOOTH_TOP_SAFE_PADDING}`}>
      <div className="container-max px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black text-charcoal-deep">{messages.title}</h1>
          <SignOutButton />
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-8 overflow-x-auto">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={clsx(
                'flex-1 min-w-max px-3 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors',
                activeTab === id
                  ? 'bg-white text-charcoal-deep shadow-sm'
                  : 'text-charcoal-muted hover:text-charcoal'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === 'orders' && (
          <OrdersTab
            orders={initialOrders}
            emptyMessage={messages.ordersEmpty}
            viewDetailLabel={messages.ordersViewDetail}
          />
        )}
        {activeTab === 'wishlist' && (
          <WishlistTab
            userId={user.id}
            initialWishlistIds={initialWishlistIds}
            emptyMessage={messages.wishlistEmpty}
            browseLabel={messages.wishlistBrowse}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab
            user={user}
            nameLabel={messages.profileName}
            emailLabel={messages.profileEmail}
            phoneLabel={messages.profilePhone}
            phonePlaceholder={messages.profilePhonePlaceholder}
            invalidPhoneMessage={messages.profileInvalidPhone}
            initialPhone={initialPhone}
            saveLabel={messages.profileSave}
            savedLabel={messages.profileSaved}
            initialMarketingConsent={initialMarketingConsent}
            marketingConsentLabel={messages.profileMarketingConsent}
            marketingConsentDesc={messages.profileMarketingConsentDesc}
            marketingConsentSavedLabel={messages.profileMarketingConsentSaved}
          />
        )}
        {activeTab === 'artist-apply' && (
          <ArtistApplyTab
            heading={messages.artistApplyHeading}
            body={messages.artistApplyBody}
            ctaLabel={messages.artistApplyCta}
          />
        )}
        {activeTab === 'exhibitor-apply' && (
          <ExhibitorApplyTab
            heading={messages.exhibitorApplyHeading}
            body={messages.exhibitorApplyBody}
            ctaLabel={messages.exhibitorApplyCta}
          />
        )}
      </div>
    </div>
  );
}
