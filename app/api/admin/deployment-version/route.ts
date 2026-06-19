import { NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/auth/guards';
import { getDeploymentId } from '@/lib/deployment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  await requireAdmin();

  return NextResponse.json(
    { deploymentId: getDeploymentId() },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
