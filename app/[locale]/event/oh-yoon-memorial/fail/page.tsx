import type { Metadata } from 'next';
import FailClient from './FailClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EventFailPage() {
  return <FailClient />;
}
