import fs from 'node:fs';
import path from 'node:path';

describe('onboarding unread agreement keyboard affordance', () => {
  const files = [
    'app/(portal)/onboarding/onboarding-form.tsx',
    'app/(portal)/exhibitor/onboarding/exhibitor-onboarding-form.tsx',
  ];

  it.each(files)('%s handles Enter/Space for unread agreement pseudo-button', (file) => {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');

    expect(src).toContain('handleUnreadAgreementKeyDown');
    expect(src).toMatch(/onKeyDown=\{\s*!allRead/);
    expect(src).not.toContain('click-events-have-key-events -- 미읽음 상태');
  });
});
