'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { claimGuestOrders } from '@/app/actions/order-lookup';
import MypageTabs from './MypageTabs';

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

interface MypageClientProps {
  messages: Messages;
}

type State =
  | { status: 'loading' }
  | {
      status: 'ready';
      user: { id: string; email: string; name: string };
      orders: Order[];
      wishlistIds: string[];
      role: string | null;
      marketingConsent: boolean;
      phone: string | null;
    };

export default function MypageClient({ messages }: MypageClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function tryGetUser(): Promise<{ id: string; email: string; name: string } | null> {
      // 최대 3회 시도 — supabase가 OAuth fragment/localStorage에서 session 회복할 시간 확보.
      // server cookie 전파 실패해도 client localStorage로 fallback 가능.
      const delays = [0, 300, 700];
      for (const delay of delays) {
        if (delay > 0) await new Promise((r) => setTimeout(r, delay));
        if (cancelled) return null;
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          return {
            id: user.id,
            email: user.email ?? '',
            name: (user.user_metadata?.name as string) ?? '',
          };
        }
      }
      return null;
    }

    (async () => {
      const user = await tryGetUser();
      if (cancelled) return;

      if (!user) {
        router.replace('/login?redirectTo=/mypage');
        return;
      }

      // 게스트(비로그인)로 결제해 buyer_user_id가 NULL인 주문을 이 계정에 자동 귀속한 뒤 목록 조회.
      // 멱등하며, 검증된 이메일이 일치하는 주문만 대상(claimGuestOrders 내부 보안 가드).
      await claimGuestOrders();
      if (cancelled) return;

      const [ordersResult, wishlistResult, profileResult] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_no, artwork_id, status, total_amount, created_at, buyer_name')
          .eq('buyer_user_id', user.id)
          .neq('status', 'pending_payment')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('wishlists')
          .select('artwork_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('role, marketing_consent, phone')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      const orders = (ordersResult.data ?? []) as Order[];
      const wishlistIds = (wishlistResult.data ?? []).map((w) => w.artwork_id as string);
      const profileRow = profileResult.data as {
        role: string | null;
        marketing_consent: boolean | null;
        phone: string | null;
      } | null;
      const role = profileRow?.role ?? null;
      const marketingConsent = profileRow?.marketing_consent ?? false;
      const phone = profileRow?.phone ?? null;

      setState({
        status: 'ready',
        user,
        orders,
        wishlistIds,
        role,
        marketingConsent,
        phone,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-canvas-soft pt-24 md:pt-28 flex items-start justify-center">
        <div
          className="mt-20 h-8 w-8 animate-spin rounded-full border-2 border-charcoal-soft border-t-transparent"
          aria-label="loading"
        />
      </div>
    );
  }

  const showArtistApply = state.role === 'user';
  const showExhibitorApply = state.role === 'user';

  return (
    <MypageTabs
      user={state.user}
      initialOrders={state.orders}
      initialWishlistIds={state.wishlistIds}
      showArtistApply={showArtistApply}
      showExhibitorApply={showExhibitorApply}
      initialMarketingConsent={state.marketingConsent}
      initialPhone={state.phone}
      messages={messages}
    />
  );
}
