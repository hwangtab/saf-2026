import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function throwConfigurationError(code: string): never {
  console.error(`[auth] ${code}`);
  throw new Error('Configuration error');
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throwConfigurationError('AUTH_CFG_MISSING_PUBLIC_SUPABASE_CONFIG_MW');
  }
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // This will refresh session if needed
  await supabase.auth.getUser();

  return response;
}
