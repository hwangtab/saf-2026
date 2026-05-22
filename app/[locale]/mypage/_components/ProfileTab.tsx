'use client';

import { useState, useTransition } from 'react';
import { updateMyProfile } from '@/app/actions/mypage';
import Button from '@/components/ui/Button';

interface ProfileTabProps {
  user: { id: string; email: string; name: string };
  nameLabel: string;
  emailLabel: string;
  saveLabel: string;
  savedLabel: string;
}

export default function ProfileTab({
  user,
  nameLabel,
  emailLabel,
  saveLabel,
  savedLabel,
}: ProfileTabProps) {
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await updateMyProfile(name);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    });
  };

  return (
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
  );
}
