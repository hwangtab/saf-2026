import { headers } from 'next/headers';
import { getClientIp } from '@/lib/security/get-client-ip';

export type RequestMetadata = {
  ip: string | null;
  userAgent: string | null;
};

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent');
  const ip = getClientIp(headerList);

  return {
    ip: ip === 'unknown' ? null : ip,
    userAgent: userAgent?.trim() || null,
  };
}
