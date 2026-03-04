import ToastProvider from '@/components/providers/ToastProvider';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <a href="#portal-content" className="skip-to-main">
        메인 콘텐츠로 이동
      </a>
      <div id="portal-content">{children}</div>
    </ToastProvider>
  );
}
