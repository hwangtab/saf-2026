import { requireAuth } from '@/lib/auth/guards';

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Ensure user is at least logged in
  await requireAuth();

  return <>{children}</>;
}
