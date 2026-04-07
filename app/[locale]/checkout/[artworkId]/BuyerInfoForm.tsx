'use client';

import { forwardRef, useImperativeHandle, useState } from 'react';

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
        oncomplete: (data: { address: string; zonecode: string }) => void;
      }) => { open(): void };
    };
  }
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
const labelClass = 'block text-sm font-medium text-charcoal mb-1';

const BuyerInfoForm = forwardRef<BuyerInfo | null, { locale: 'ko' | 'en' }>(({ locale }, ref) => {
  const isKo = locale === 'ko';

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
          setForm((prev) => ({
            ...prev,
            shippingAddress: data.address,
            shippingPostalCode: data.zonecode,
          }));
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
        <h3 className="mb-4 text-base font-semibold text-charcoal">
          {isKo ? '구매자 정보' : 'Buyer Information'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              {isKo ? '이름' : 'Name'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className={inputClass}
              value={form.buyerName}
              onChange={handleChange('buyerName')}
              required
              placeholder={isKo ? '홍길동' : 'Full name'}
            />
          </div>
          <div>
            <label className={labelClass}>
              {isKo ? '이메일' : 'Email'} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              className={inputClass}
              value={form.buyerEmail}
              onChange={handleChange('buyerEmail')}
              required
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className={labelClass}>
              {isKo ? '연락처' : 'Phone'} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
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
        <h3 className="mb-4 text-base font-semibold text-charcoal">
          {isKo ? '배송지 정보' : 'Shipping Information'}
        </h3>

        <label className="mb-4 flex cursor-pointer items-center gap-2 text-sm text-charcoal">
          <input
            type="checkbox"
            checked={sameAsBuyer}
            onChange={(e) => setSameAsBuyer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
          />
          {isKo ? '구매자 정보와 동일' : 'Same as buyer information'}
        </label>

        <div className="space-y-4">
          {!sameAsBuyer && (
            <>
              <div>
                <label className={labelClass}>
                  {isKo ? '수령인' : 'Recipient'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.shippingName}
                  onChange={handleChange('shippingName')}
                  required
                  placeholder={isKo ? '홍길동' : 'Full name'}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {isKo ? '연락처' : 'Phone'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
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
              {isKo ? '주소' : 'Address'} <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                className={inputClass}
                value={form.shippingAddress}
                readOnly
                placeholder={isKo ? '주소 검색을 클릭하세요' : 'Click to search address'}
              />
              <button
                type="button"
                onClick={handleAddressSearch}
                className="shrink-0 rounded-lg border border-primary px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
              >
                {isKo ? '주소 검색' : 'Search'}
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>{isKo ? '우편번호' : 'Postal Code'}</label>
            <input
              type="text"
              className={inputClass}
              value={form.shippingPostalCode}
              readOnly
              placeholder={isKo ? '우편번호' : 'Postal code'}
            />
          </div>

          <div>
            <label className={labelClass}>{isKo ? '상세 주소' : 'Address Detail'}</label>
            <input
              type="text"
              className={inputClass}
              value={form.shippingAddressDetail}
              onChange={handleChange('shippingAddressDetail')}
              placeholder={isKo ? '동/호수 등 상세 주소' : 'Apartment, suite, etc.'}
            />
          </div>

          <div>
            <label className={labelClass}>{isKo ? '배송 메모' : 'Delivery Note'}</label>
            <input
              type="text"
              className={inputClass}
              value={form.shippingMemo}
              onChange={handleChange('shippingMemo')}
              placeholder={isKo ? '배송 시 요청사항 (선택)' : 'Special instructions (optional)'}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

BuyerInfoForm.displayName = 'BuyerInfoForm';

export default BuyerInfoForm;
