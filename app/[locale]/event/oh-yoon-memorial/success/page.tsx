import type { Metadata } from 'next';
import SuccessClient from './SuccessClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EventSuccessPage() {
  return <SuccessClient />;
}
