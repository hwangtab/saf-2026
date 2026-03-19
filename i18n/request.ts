import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as 'ko' | 'en')) {
    locale = routing.defaultLocale;
  }

  const [base, admin, dashboard] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/${locale}.admin.json`),
    import(`../messages/${locale}.dashboard.json`),
  ]);

  return {
    locale,
    messages: {
      ...base.default,
      ...admin.default,
      ...dashboard.default,
    },
  };
});
