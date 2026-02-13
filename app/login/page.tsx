'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const getOAuthRedirectUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const baseUrl = envUrl && envUrl.startsWith('http') ? envUrl : window.location.origin;
    return `${baseUrl}/auth/callback`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let nextPath = '/dashboard';

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.role === 'admin') {
          nextPath = '/admin/dashboard?period=7d';
        } else if (profile?.role === 'exhibitor') {
          nextPath = '/exhibitor';
        } else if (profile?.role === 'artist') {
          if (profile.status === 'active') {
            nextPath = '/dashboard/artworks';
          } else if (profile.status === 'suspended') {
            nextPath = '/dashboard/suspended';
          } else if (profile.status === 'pending') {
            const { data: application } = await supabase
              .from('artist_applications')
              .select('artist_name, contact, bio')
              .eq('user_id', user.id)
              .maybeSingle();

            const hasApplication =
              !!application?.artist_name?.trim() &&
              !!application?.contact?.trim() &&
              !!application?.bio?.trim();

            nextPath = hasApplication ? '/dashboard/pending' : '/onboarding';
          }
        } else if (profile?.role === 'user') {
          nextPath = '/onboarding';
        }
      }

      router.push(nextPath);
      router.refresh();
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    setOauthLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getOAuthRedirectUrl(),
      },
    });

    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF 2026
          <br />
          <span className="text-xl font-medium text-gray-600">아티스트 로그인</span>
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-3">
            <Button
              type="button"
              variant="white"
              className="w-full justify-center"
              loading={oauthLoading === 'google'}
              disabled={oauthLoading !== null}
              onClick={() => handleOAuthLogin('google')}
            >
              구글로 계속하기
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-gray-400">또는 이메일 로그인</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                이메일 주소
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                비밀번호
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            {error && <div className="text-red-500 text-sm">{error}</div>}

            <div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full flex justify-center"
              >
                로그인
              </Button>
            </div>

            {/* Simple footer for sign up hint */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">계정이 없으신가요? </span>
              <Link href="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                회원가입
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
