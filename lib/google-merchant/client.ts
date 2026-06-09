import { google } from 'googleapis';

export const MERCHANT_API_SCOPE = 'https://www.googleapis.com/auth/content';
const MERCHANT_API_BASE = 'https://merchantapi.googleapis.com/products/v1';

export type MerchantClientConfig = {
  accountId: string;
  dataSourceName: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  serviceAccountKey?: string;
};

export type MerchantApiClient = {
  insertProductInput(productInput: unknown): Promise<unknown>;
  deleteProductInput(productInputName: string): Promise<void>;
};

function requireValue(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`[google-merchant] missing env: ${name}`);
  return trimmed;
}

export function getMerchantClientConfig(
  env: NodeJS.ProcessEnv = process.env
): MerchantClientConfig {
  return {
    accountId: requireValue(env.GOOGLE_MERCHANT_ACCOUNT_ID, 'GOOGLE_MERCHANT_ACCOUNT_ID'),
    dataSourceName: requireValue(
      env.GOOGLE_MERCHANT_DATASOURCE_NAME,
      'GOOGLE_MERCHANT_DATASOURCE_NAME'
    ),
    clientId: env.GOOGLE_MERCHANT_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_MERCHANT_OAUTH_CLIENT_SECRET,
    refreshToken: env.GOOGLE_MERCHANT_OAUTH_REFRESH_TOKEN,
    serviceAccountKey: env.GOOGLE_MERCHANT_SERVICE_ACCOUNT_KEY,
  };
}

export async function getMerchantAccessToken(config: MerchantClientConfig): Promise<string> {
  if (config.serviceAccountKey) {
    const key = JSON.parse(config.serviceAccountKey) as {
      client_email: string;
      private_key: string;
    };
    const auth = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: [MERCHANT_API_SCOPE],
    });
    const token = await auth.getAccessToken();
    if (!token.token) throw new Error('[google-merchant] failed to obtain SA access token');
    return token.token;
  }

  const oauth2 = new google.auth.OAuth2(
    requireValue(config.clientId, 'GOOGLE_MERCHANT_OAUTH_CLIENT_ID'),
    requireValue(config.clientSecret, 'GOOGLE_MERCHANT_OAUTH_CLIENT_SECRET')
  );
  oauth2.setCredentials({
    refresh_token: requireValue(config.refreshToken, 'GOOGLE_MERCHANT_OAUTH_REFRESH_TOKEN'),
  });
  const token = await oauth2.getAccessToken();
  if (!token.token) throw new Error('[google-merchant] failed to obtain OAuth access token');
  return token.token;
}

async function merchantFetch(
  url: string,
  init: RequestInit,
  accessToken: string
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (res.status === 204) return null;

  const bodyText = await res.text();
  const body = bodyText ? JSON.parse(bodyText) : null;
  if (!res.ok) {
    throw new Error(
      `[google-merchant] API ${res.status} ${res.statusText}: ${bodyText || 'empty body'}`
    );
  }
  return body;
}

export async function createMerchantApiClient(
  config: MerchantClientConfig = getMerchantClientConfig()
): Promise<MerchantApiClient> {
  const accessToken = await getMerchantAccessToken(config);
  const parent = `accounts/${config.accountId}`;
  const insertUrl = `${MERCHANT_API_BASE}/${parent}/productInputs:insert?dataSource=${encodeURIComponent(
    config.dataSourceName
  )}`;

  return {
    insertProductInput(productInput: unknown) {
      return merchantFetch(
        insertUrl,
        {
          method: 'POST',
          body: JSON.stringify(productInput),
        },
        accessToken
      );
    },
    async deleteProductInput(productInputName: string) {
      const url = `${MERCHANT_API_BASE}/${productInputName}`;
      await merchantFetch(url, { method: 'DELETE' }, accessToken);
    },
  };
}
