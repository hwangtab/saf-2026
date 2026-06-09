'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';

export interface BuyerInfo {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingPostalCode: string;
  shippingMemo: string;
}

export interface BuyerInfoHandle {
  getValues: () => BuyerInfo;
  /** 필수 필드 검증 + 첫 오류 필드 스크롤·포커스. 통과하면 true 반환. */
  validate: () => boolean;
}

interface FormState {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  shippingPostalCode: string;
  shippingMemo: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

declare global {
  interface Window {
    daum?: {
      Postcode: new (opts: {
        oncomplete: (data: {
          address: string;
          roadAddress: string;
          jibunAddress: string;
          zonecode: string;
          userSelectedType: 'R' | 'J';
        }) => void;
        onclose?: (state: 'FORCE_CLOSE' | 'COMPLETE_CLOSE') => void;
        width?: string | number;
        height?: string | number;
      }) => { open(): void; embed(element: HTMLElement): void };
    };
  }
}

// iOS Safari auto-zoom 회피를 위해 input은 text-base(16px) — text-sm(14px)이면
// focus 시 viewport가 자동 줌됨. 라벨은 14px 유지(zoom 트리거 아님).
const inputBase =
  'w-full rounded-lg border px-3 py-2 text-base placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-colors';
const labelClass = 'block text-sm font-medium text-charcoal mb-1';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 필드 key → DOM id 매핑 (기존 id 재사용)
const FIELD_ID: Record<keyof FormState, string> = {
  buyerName: 'checkout-buyer-name',
  buyerEmail: 'checkout-buyer-email',
  buyerPhone: 'checkout-buyer-phone',
  shippingName: 'checkout-shipping-name',
  shippingPhone: 'checkout-shipping-phone',
  shippingAddress: 'checkout-shipping-address',
  shippingPostalCode: 'checkout-shipping-postal',
  shippingAddressDetail: 'checkout-shipping-detail',
  shippingMemo: 'checkout-shipping-memo',
};

function fieldInputClass(error: string | undefined) {
  return `${inputBase} ${error ? 'border-danger focus-visible:ring-danger focus-visible:border-danger' : 'border-gray-300'}`;
}

function FieldError({ msg, id }: { msg: string | undefined; id: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 text-sm text-danger-a11y" role="alert">
      {msg}
    </p>
  );
}

const BuyerInfoForm = forwardRef<
  BuyerInfoHandle,
  { initialBuyer?: { name?: string; email?: string } }
>(({ initialBuyer }, ref) => {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const langAttr = locale === 'ko' ? 'ko' : 'en';
  // 영문 사용자는 한국 우편번호 검색 API(Daum)를 못 쓰므로 주소·우편번호를 직접 입력
  const isKorean = locale === 'ko';
  const detailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    buyerName: initialBuyer?.name ?? '',
    buyerEmail: initialBuyer?.email ?? '',
    buyerPhone: '',
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    shippingPostalCode: '',
    shippingMemo: '',
  });
  const [sameAsBuyer, setSameAsBuyer] = useState(true);
  const [addressLayerOpen, setAddressLayerOpen] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const addressLayerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      ...form,
      shippingName: sameAsBuyer ? form.buyerName : form.shippingName,
      shippingPhone: sameAsBuyer ? form.buyerPhone : form.shippingPhone,
    }),
    validate: () => {
      const next: FormErrors = {};

      if (!form.buyerName.trim()) next.buyerName = t('errorFieldName');
      if (!form.buyerEmail.trim()) {
        next.buyerEmail = t('errorFieldEmail');
      } else if (!EMAIL_RE.test(form.buyerEmail.trim())) {
        next.buyerEmail = t('errorFieldEmailInvalid');
      }
      if (!form.buyerPhone.trim()) next.buyerPhone = t('errorFieldPhone');

      if (!sameAsBuyer) {
        if (!form.shippingName.trim()) next.shippingName = t('errorFieldName');
        if (!form.shippingPhone.trim()) next.shippingPhone = t('errorFieldPhone');
      }

      if (!form.shippingAddress.trim()) next.shippingAddress = t('errorFieldAddress');
      if (!form.shippingPostalCode.trim()) next.shippingPostalCode = t('errorFieldPostal');
      setErrors(next);

      const firstErrorKey = (Object.keys(next) as (keyof FormState)[]).find((k) => next[k]);
      if (firstErrorKey) {
        const el = document.getElementById(FIELD_ID[firstErrorKey]);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          el.focus({ preventScroll: true });
        }
        return false;
      }
      return true;
    },
  }));

  // Daum Postcode 스크립트 mount 시 미리 로드.
  useEffect(() => {
    if (!isKorean) return;
    if (typeof window === 'undefined') return;
    if (window.daum?.Postcode) return;
    const script = document.createElement('script');
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.head.appendChild(script);
  }, [isKorean]);

  // 레이어 열릴 때 embed — popup 모드 (.open()) 대신 iframe 임베드로 popup blocker 회피.
  useEffect(() => {
    if (!addressLayerOpen) return;
    if (typeof window === 'undefined') return;
    if (!window.daum?.Postcode) return;
    if (!addressLayerRef.current) return;

    new window.daum.Postcode({
      oncomplete: (data) => {
        const selectedAddress =
          data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
        setForm((prev) => ({
          ...prev,
          shippingAddress: selectedAddress,
          shippingPostalCode: data.zonecode,
        }));
        setErrors((prev) => ({
          ...prev,
          shippingAddress: undefined,
          shippingPostalCode: undefined,
        }));
        setAddressLayerOpen(false);
        setTimeout(() => detailRef.current?.focus(), 200);
      },
      width: '100%',
      height: '100%',
    }).embed(addressLayerRef.current);
  }, [addressLayerOpen]);

  function handleChange(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  return (
    <div className="space-y-6">
      {/* Daum Postcode 임베드 레이어 — popup blocker 회피 위해 .embed() iframe 모드 사용 */}
      {addressLayerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 p-4"
          aria-modal="true"
          aria-label={t('shippingAddress')}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <button
              type="button"
              onClick={() => setAddressLayerOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-500 shadow-sm hover:text-charcoal"
              aria-label="close"
            >
              ✕
            </button>
            <div ref={addressLayerRef} className="h-[500px] w-full overflow-hidden rounded-2xl" />
          </div>
        </div>
      )}

      {/* 구매자 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-charcoal">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-a11y">
            1
          </span>
          {t('buyerInfo')}
        </h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="checkout-buyer-name" className={labelClass}>
              {t('buyerName')} <span className="text-danger">*</span>
            </label>
            <input
              id="checkout-buyer-name"
              type="text"
              name="name"
              autoComplete="name"
              lang={langAttr}
              className={fieldInputClass(errors.buyerName)}
              value={form.buyerName}
              onChange={handleChange('buyerName')}
              aria-invalid={!!errors.buyerName}
              aria-describedby={errors.buyerName ? 'err-checkout-buyer-name' : undefined}
              placeholder={t('placeholderName')}
            />
            <FieldError msg={errors.buyerName} id="err-checkout-buyer-name" />
          </div>
          <div>
            <label htmlFor="checkout-buyer-email" className={labelClass}>
              {t('buyerEmail')} <span className="text-danger">*</span>
            </label>
            <input
              id="checkout-buyer-email"
              type="email"
              name="email"
              autoComplete="email"
              className={fieldInputClass(errors.buyerEmail)}
              value={form.buyerEmail}
              onChange={handleChange('buyerEmail')}
              aria-invalid={!!errors.buyerEmail}
              aria-describedby={errors.buyerEmail ? 'err-checkout-buyer-email' : undefined}
              placeholder="example@email.com"
            />
            <FieldError msg={errors.buyerEmail} id="err-checkout-buyer-email" />
          </div>
          <div>
            <label htmlFor="checkout-buyer-phone" className={labelClass}>
              {t('buyerPhone')} <span className="text-danger">*</span>
            </label>
            <input
              id="checkout-buyer-phone"
              type="tel"
              name="tel"
              autoComplete="tel"
              className={fieldInputClass(errors.buyerPhone)}
              value={form.buyerPhone}
              onChange={handleChange('buyerPhone')}
              aria-invalid={!!errors.buyerPhone}
              aria-describedby={errors.buyerPhone ? 'err-checkout-buyer-phone' : undefined}
              placeholder={t('placeholderPhone')}
            />
            <FieldError msg={errors.buyerPhone} id="err-checkout-buyer-phone" />
          </div>
        </div>
      </div>

      {/* 배송지 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-charcoal">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-a11y">
            2
          </span>
          {t('shippingInfo')}
        </h3>

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={sameAsBuyer}
            onChange={(e) => setSameAsBuyer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          {t('sameAsBuyer')}
        </label>

        <div className="space-y-4">
          {!sameAsBuyer && (
            <>
              <div>
                <label htmlFor="checkout-shipping-name" className={labelClass}>
                  {t('shippingName')} <span className="text-danger">*</span>
                </label>
                <input
                  id="checkout-shipping-name"
                  type="text"
                  name="shipping-name"
                  autoComplete="shipping name"
                  lang={langAttr}
                  className={fieldInputClass(errors.shippingName)}
                  value={form.shippingName}
                  onChange={handleChange('shippingName')}
                  aria-invalid={!!errors.shippingName}
                  aria-describedby={errors.shippingName ? 'err-checkout-shipping-name' : undefined}
                  placeholder={t('placeholderName')}
                />
                <FieldError msg={errors.shippingName} id="err-checkout-shipping-name" />
              </div>
              <div>
                <label htmlFor="checkout-shipping-phone" className={labelClass}>
                  {t('buyerPhone')} <span className="text-danger">*</span>
                </label>
                <input
                  id="checkout-shipping-phone"
                  type="tel"
                  name="shipping-tel"
                  autoComplete="shipping tel"
                  className={fieldInputClass(errors.shippingPhone)}
                  value={form.shippingPhone}
                  onChange={handleChange('shippingPhone')}
                  aria-invalid={!!errors.shippingPhone}
                  aria-describedby={
                    errors.shippingPhone ? 'err-checkout-shipping-phone' : undefined
                  }
                  placeholder={t('placeholderPhone')}
                />
                <FieldError msg={errors.shippingPhone} id="err-checkout-shipping-phone" />
              </div>
            </>
          )}

          <div>
            <label htmlFor="checkout-shipping-address" className={labelClass}>
              {t('addressLabel')} <span className="text-danger">*</span>
            </label>
            {isKorean ? (
              // 한국 사용자: Daum 우편번호 API로 주소 선택 (readOnly)
              <>
                <div className="flex gap-2">
                  <input
                    id="checkout-shipping-address"
                    type="text"
                    className={fieldInputClass(errors.shippingAddress)}
                    value={form.shippingAddress}
                    readOnly
                    placeholder={t('placeholderAddress')}
                    aria-invalid={!!errors.shippingAddress}
                    aria-describedby={
                      errors.shippingAddress ? 'err-checkout-shipping-address' : undefined
                    }
                  />
                  <Button
                    type="button"
                    onClick={() => setAddressLayerOpen(true)}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {t('searchAddress')}
                  </Button>
                </div>
                <FieldError msg={errors.shippingAddress} id="err-checkout-shipping-address" />
              </>
            ) : (
              // 영문 사용자: 자유 입력
              <>
                <input
                  id="checkout-shipping-address"
                  type="text"
                  name="address"
                  autoComplete="shipping street-address"
                  className={fieldInputClass(errors.shippingAddress)}
                  value={form.shippingAddress}
                  onChange={handleChange('shippingAddress')}
                  aria-invalid={!!errors.shippingAddress}
                  aria-describedby={
                    errors.shippingAddress ? 'err-checkout-shipping-address' : undefined
                  }
                  placeholder="123 Main St, City, State"
                />
                <FieldError msg={errors.shippingAddress} id="err-checkout-shipping-address" />
              </>
            )}
          </div>

          <div>
            <label htmlFor="checkout-shipping-postal" className={labelClass}>
              {t('shippingPostalCode')} <span className="text-danger">*</span>
            </label>
            <input
              id="checkout-shipping-postal"
              type="text"
              name="postal-code"
              autoComplete="postal-code"
              className={fieldInputClass(errors.shippingPostalCode)}
              value={form.shippingPostalCode}
              readOnly={isKorean}
              onChange={isKorean ? undefined : handleChange('shippingPostalCode')}
              aria-invalid={!!errors.shippingPostalCode}
              aria-describedby={
                errors.shippingPostalCode ? 'err-checkout-shipping-postal' : undefined
              }
              placeholder={isKorean ? t('shippingPostalCode') : '12345 / SW1A 1AA'}
            />
            <FieldError msg={errors.shippingPostalCode} id="err-checkout-shipping-postal" />
          </div>

          <div>
            <label htmlFor="checkout-shipping-detail" className={labelClass}>
              {t('shippingAddressDetail')}{' '}
              <span className="font-normal text-charcoal-soft">{t('optionalField')}</span>
            </label>
            <input
              id="checkout-shipping-detail"
              ref={detailRef}
              type="text"
              name="address-detail"
              autoComplete="address-line2"
              lang={langAttr}
              inputMode="text"
              className={fieldInputClass(errors.shippingAddressDetail)}
              value={form.shippingAddressDetail}
              onChange={handleChange('shippingAddressDetail')}
              onFocus={(e) => e.currentTarget.setAttribute('lang', langAttr)}
              aria-invalid={!!errors.shippingAddressDetail}
              aria-describedby="hint-checkout-shipping-detail"
              placeholder={t('placeholderAddressDetail')}
            />
            <p id="hint-checkout-shipping-detail" className="mt-1 text-xs text-charcoal-soft">
              {t('addressDetailOptionalHint')}
            </p>
            <FieldError msg={errors.shippingAddressDetail} id="err-checkout-shipping-detail" />
          </div>

          <div>
            <label htmlFor="checkout-shipping-memo" className={labelClass}>
              {t('shippingMemo')}
            </label>
            <input
              id="checkout-shipping-memo"
              type="text"
              lang={langAttr}
              inputMode="text"
              className={fieldInputClass(errors.shippingMemo)}
              value={form.shippingMemo}
              onChange={handleChange('shippingMemo')}
              onFocus={(e) => e.currentTarget.setAttribute('lang', langAttr)}
              placeholder={t('placeholderMemo')}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

BuyerInfoForm.displayName = 'BuyerInfoForm';

export default BuyerInfoForm;
