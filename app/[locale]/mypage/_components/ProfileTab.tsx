'use client';

import { useState, useTransition } from 'react';
import { updateMyProfile, updateMarketingConsent } from '@/app/actions/mypage';
import Button from '@/components/ui/Button';

interface ProfileTabProps {
  user: { id: string; email: string; name: string };
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  invalidPhoneMessage: string;
  initialPhone: string | null;
  saveLabel: string;
  savedLabel: string;
  initialMarketingConsent: boolean;
  marketingConsentLabel: string;
  marketingConsentDesc: string;
  marketingConsentSavedLabel: string;
}

export default function ProfileTab({
  user,
  nameLabel,
  emailLabel,
  phoneLabel,
  phonePlaceholder,
  invalidPhoneMessage,
  initialPhone,
  saveLabel,
  savedLabel,
  initialMarketingConsent,
  marketingConsentLabel,
  marketingConsentDesc,
  marketingConsentSavedLabel,
}: ProfileTabProps) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [marketingConsent, setMarketingConsent] = useState(initialMarketingConsent);
  const [consentSaved, setConsentSaved] = useState(false);
  const [, startConsentTransition] = useTransition();

  const handleConsentToggle = (checked: boolean) => {
    setMarketingConsent(checked);
    setConsentSaved(false);
    startConsentTransition(async () => {
      await updateMarketingConsent(checked);
      setConsentSaved(true);
      setTimeout(() => setConsentSaved(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateMyProfile(name, phone.trim() !== '' ? phone : undefined);
      if (result.error) {
        setError(result.error === 'invalid_phone' ? invalidPhoneMessage : result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">{nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">{emailLabel}</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-charcoal-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">{phoneLabel}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={phonePlaceholder}
              autoComplete="tel"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
            />
          </div>
          {error && <p className="text-danger-a11y text-sm">{error}</p>}
          <Button
            type="submit"
            loading={isPending}
            disabled={isPending}
            className="w-full justify-center"
          >
            {saved ? savedLabel : saveLabel}
          </Button>
        </form>
      </div>
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex cursor-pointer items-start gap-3">
          <input
            id="marketing-consent-checkbox"
            type="checkbox"
            checked={marketingConsent}
            onChange={(e) => handleConsentToggle(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          <div>
            <label
              htmlFor="marketing-consent-checkbox"
              className="cursor-pointer text-sm font-medium text-charcoal"
            >
              {marketingConsentLabel}
            </label>
            <div className="mt-0.5 text-sm text-charcoal-muted">{marketingConsentDesc}</div>
          </div>
        </div>
        {consentSaved && (
          <p className="mt-2 text-sm text-success-a11y">{marketingConsentSavedLabel}</p>
        )}
      </div>
    </>
  );
}
