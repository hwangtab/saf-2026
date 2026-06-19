import { shouldReloadForDeploymentChange } from '@/app/(portal)/admin/_components/AdminDeploymentRefresh';

describe('admin deployment refresh guard', () => {
  it('reloads only when the latest deployment id is a different non-empty string', () => {
    expect(shouldReloadForDeploymentChange('commit-a', 'commit-b')).toBe(true);
    expect(shouldReloadForDeploymentChange('commit-a', 'commit-a')).toBe(false);
    expect(shouldReloadForDeploymentChange('commit-a', '')).toBe(false);
    expect(shouldReloadForDeploymentChange('', 'commit-b')).toBe(false);
    expect(shouldReloadForDeploymentChange('commit-a', undefined)).toBe(false);
  });
});
