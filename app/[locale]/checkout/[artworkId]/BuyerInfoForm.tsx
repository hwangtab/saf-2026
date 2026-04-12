'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
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
      }) => { open(): void };
    };
  }
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary';
const labelClass = 'block text-sm font-medium text-charcoal mb-1';

const BuyerInfoForm = forwardRef<BuyerInfo | null, object>((_props, ref) => {
  const t = useTranslations('checkout');
  const locale = useLocale();
  const langAttr = locale === 'ko' ? 'ko' : 'en';
  const detailRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    buyerName: '',
    buyerEmail: '',
    buyerPhone: '',
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingAddressDetail: '',
    shippingPostalCode: '',
    shippingMemo: '',
  });
  const [sameAsBuyer, setSameAsBuyer] = useState(true);

  useImperativeHandle(ref, () => ({
    ...form,
    shippingName: sameAsBuyer ? form.buyerName : form.shippingName,
    shippingPhone: sameAsBuyer ? form.buyerPhone : form.shippingPhone,
  }));

  function handleChange(key: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };
  }

  function handleAddressSearch() {
    if (typeof window === 'undefined') return;

    const openPostcode = () => {
      if (!window.daum?.Postcode) return;
      new window.daum.Postcode({
        oncomplete: (data) => {
          const selectedAddress =
            data.userSelectedType === 'R' ? data.roadAddress : data.jibunAddress;
          setForm((prev) => ({
            ...prev,
            shippingAddress: selectedAddress,
            shippingPostalCode: data.zonecode,
          }));
          setTimeout(() => detailRef.current?.focus(), 200);
        },
      }).open();
    };

    if (window.daum?.Postcode) {
      openPostcode();
    } else {
      const script = document.createElement('script');
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = openPostcode;
      document.head.appendChild(script);
    }
  }

  return (
    <div className="space-y-6">
      {/* 구매자 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-charcoal">{t('buyerInfo')}</h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              {t('buyerName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              autoComplete="name"
              lang={langAttr}
              className={inputClass}
              value={form.buyerName}
              onChange={handleChange('buyerName')}
              required
              placeholder={t('placeholderName')}
            />
          </div>
          <div>
            <label className={labelClass}>
              {t('buyerEmail')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              autoComplete="email"
              className={inputClass}
              value={form.buyerEmail}
              onChange={handleChange('buyerEmail')}
              required
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className={labelClass}>
              {t('buyerPhone')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="tel"
              autoComplete="tel"
              className={inputClass}
              value={form.buyerPhone}
              onChange={handleChange('buyerPhone')}
              required
              placeholder="010-0000-0000"
            />
          </div>
        </div>
      </div>

      {/* 배송지 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-charcoal">{t('shippingInfo')}</h3>

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
                <label className={labelClass}>
                  {t('shippingName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="shipping-name"
                  autoComplete="shipping name"
                  lang={langAttr}
                  className={inputClass}
                  value={form.shippingName}
                  onChange={handleChange('shippingName')}
                  required
                  placeholder={t('placeholderName')}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('buyerPhone')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="shipping-tel"
                  autoComplete="shipping tel"
                  className={inputClass}
                  value={form.shippingPhone}
                  onChange={handleChange('shippingPhone')}
                  required
                  placeholder="010-0000-0000"
                />
              </div>
            </>
          )}

          <div>
            <label className={labelClass}>
              {t('addressLabel')} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className={inputClass}
                value={form.shippingAddress}
                readOnly
                placeholder={t('placeholderAddress')}
              />
              <Button
                type="button"
                onClick={handleAddressSearch}
                variant="outline"
                size="sm"
                className="shrink-0"
              >
                {t('searchAddress')}
              </Button>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('shippingPostalCode')}</label>
            <input
              type="text"
              name="postal-code"
              autoComplete="postal-code"
              className={inputClass}
              value={form.shippingPostalCode}
              readOnly
              placeholder={t('shippingPostalCode')}
            />
          </div>

          <div>
            <label className={labelClass}>
              {t('shippingAddressDetail')} <span className="text-red-500">*</span>
            </label>
            <input
              ref={detailRef}
              type="text"
              name="address-detail"
              autoComplete="address-line2"
              lang={langAttr}
              inputMode="text"
              className={inputClass}
              value={form.shippingAddressDetail}
              onChange={handleChange('shippingAddressDetail')}
              onFocus={(e) => e.currentTarget.setAttribute('lang', langAttr)}
              placeholder={t('placeholderAddressDetail')}
            />
          </div>

          <div>
            <label className={labelClass}>{t('shippingMemo')}</label>
            <input
              type="text"
              lang={langAttr}
              inputMode="text"
              className={inputClass}
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
