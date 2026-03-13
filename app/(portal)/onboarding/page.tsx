import { requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './onboarding-form';
import { SignOutButton } from '@/components/auth/SignOutButton';
import Link from 'next/link';
import { getServerLocale } from '@/lib/server-locale';

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ recover?: string; role?: string }>;
}) {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          chooseType: 'Choose application type',
          chooseDescription: 'Select the type that matches how you want to participate.',
          applyArtist: 'Apply as artist',
          applyArtistDescription:
            'Artist directly consigning own artworks for exhibition and sales',
          applyExhibitor: 'Apply as exhibitor',
          applyExhibitorDescription:
            'Gallery/curator representing affiliated artists and managing submissions',
          artistRecoveryTitle: 'Recover artist information',
          artistOnboardingTitle: 'Enter artist information',
          artistRecoveryDescription:
            'Existing artist application data is missing and must be recovered. After saving, you will be redirected to the artist dashboard.',
          artistOnboardingDescription:
            'Submit minimum information for approval. Dashboard access remains restricted until approval.',
        }
      : {
          chooseType: '신청 유형 선택',
          chooseDescription: '참여 방식에 맞는 유형을 선택해주세요.',
          applyArtist: '작가로 신청',
          applyArtistDescription: '작품을 직접 전시·판매 위탁하는 작가',
          applyExhibitor: '출품자로 신청',
          applyExhibitorDescription: '소속 작가의 작품을 대리 출품·관리하는 갤러리·큐레이터',
          artistRecoveryTitle: '작가 정보 복구',
          artistOnboardingTitle: '작가 정보 입력',
          artistRecoveryDescription:
            '기존 작가 계정의 신청서 정보가 누락되어 복구가 필요합니다. 정보 저장 후 바로 작가 대시보드로 이동합니다.',
          artistOnboardingDescription:
            '승인 심사를 위해 최소 정보만 제출해주세요. 제출 후에는 관리자 승인 전까지 대시보드 접근이 제한됩니다.',
        };

  const user = await requireAuth();
  const params = await searchParams;
  const isRecoveryFlow = params.recover === '1';
  const role = params.role;
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (profile?.role === 'exhibitor') {
    if (profile.status === 'active') {
      redirect(isRecoveryFlow ? '/exhibitor/onboarding?recover=1' : '/exhibitor');
    }
    if (profile.status === 'suspended') {
      redirect('/exhibitor/suspended');
    }
    redirect('/exhibitor/pending');
  }

  if (role === 'exhibitor') {
    redirect('/exhibitor/onboarding');
  }

  if (profile?.role === 'artist' && profile?.status === 'active') {
    if (!isRecoveryFlow) {
      redirect('/dashboard/profile');
    }
  }
  if (profile?.role === 'artist' && profile?.status === 'suspended') {
    redirect('/dashboard/suspended');
  }

  const [{ data: application }, { data: exhibitorApplication }] = await Promise.all([
    supabase
      .from('artist_applications')
      .select('artist_name, contact, bio, referrer')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('exhibitor_applications')
      .select('representative_name, contact, bio')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const hasExhibitorApplication =
    !!exhibitorApplication?.representative_name?.trim() &&
    !!exhibitorApplication?.contact?.trim() &&
    !!exhibitorApplication?.bio?.trim();

  if (profile?.role === 'user' && hasExhibitorApplication) {
    redirect('/exhibitor/pending');
  }

  const isArtistRecovery =
    isRecoveryFlow && profile?.role === 'artist' && profile?.status === 'active';

  if (!isRecoveryFlow && role !== 'artist') {
    return (
      <div className="relative min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <SignOutButton />
        </div>
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">SAF 2026</h2>
          <p className="mt-2 text-center text-lg font-medium text-gray-600">{copy.chooseType}</p>
          <p className="mt-3 text-center text-sm text-gray-500">{copy.chooseDescription}</p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 px-4 sm:px-0">
            <Link
              href="/onboarding?role=artist"
              className="flex flex-col rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 hover:shadow-md transition-all"
            >
              <span className="text-lg font-semibold text-gray-900">{copy.applyArtist}</span>
              <span className="mt-2 text-sm text-gray-500">{copy.applyArtistDescription}</span>
            </Link>

            <Link
              href="/exhibitor/onboarding"
              className="flex flex-col rounded-lg border-2 border-gray-200 bg-white p-6 shadow-sm hover:border-gray-900 hover:shadow-md transition-all"
            >
              <span className="text-lg font-semibold text-gray-900">{copy.applyExhibitor}</span>
              <span className="mt-2 text-sm text-gray-500">{copy.applyExhibitorDescription}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <SignOutButton />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF 2026
          <br />
          <span className="text-xl font-medium text-gray-600">
            {isArtistRecovery ? copy.artistRecoveryTitle : copy.artistOnboardingTitle}
          </span>
        </h2>
        <p className="mt-4 text-center text-sm text-gray-500">
          {isArtistRecovery ? copy.artistRecoveryDescription : copy.artistOnboardingDescription}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <OnboardingForm defaultValues={application} />
        </div>
      </div>
    </div>
  );
}
