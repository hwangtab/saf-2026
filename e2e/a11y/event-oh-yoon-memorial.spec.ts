import { test, expect } from './fixtures';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['ko', 'en'] as const) {
  test(`/${locale}/event/oh-yoon-memorial 추도식 신청 — WCAG AA a11y 위반 없음`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/event/oh-yoon-memorial`, { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', {
        name: locale === 'en' ? 'Oh Yoon 40th Memorial' : '오윤 40주기 추도식',
      })
    ).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
