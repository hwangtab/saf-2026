import { SignOutButton } from '@/components/auth/SignOutButton';

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center bg-white p-10 rounded-xl shadow-md border border-red-100">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-red-600">계정 정지됨</h2>
          <div className="mt-4 text-5xl">🚫</div>
          <p className="mt-6 text-sm text-gray-600 leading-relaxed">
            회원님의 계정은 운영 정책 위반 또는 관리자의 판단에 의해
            <br />
            이용이 제한되었습니다.
            <br />
            문의사항이 있으시면 관리자에게 연락해주세요.
          </p>
        </div>
        <div className="pt-4 border-t border-gray-100">
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
