import { headers } from 'next/headers';

export type RequestMetadata = {
  ip: string | null;
  userAgent: string | null;
};

export async function getRequestMetadata(): Promise<RequestMetadata> {
  const headerList = await headers();
  const forwardedFor = headerList.get('x-forwarded-for');
  const realIp = headerList.get('x-real-ip');
  const userAgent = headerList.get('user-agent');

  const ip =
    forwardedFor
      ?.split(',')
      .map((value) => value.trim())
      .find((value) => value.length > 0) ||
    realIp?.trim() ||
    null;

  return {
    ip,
    userAgent: userAgent?.trim() || null,
  };
}
