import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (relativePath: string) => readFileSync(join(ROOT, relativePath), 'utf8');

describe('admin deployment refresh wiring', () => {
  const componentSource = read(
    'app/(portal)/admin/_components/AdminDeploymentRefresh.tsx'
  );
  const layoutSource = read('app/(portal)/admin/layout.tsx');
  const routeSource = read('app/api/admin/deployment-version/route.ts');

  it('checks the current admin deployment without using a cached response', () => {
    expect(componentSource).toContain(
      "export const ADMIN_DEPLOYMENT_VERSION_ENDPOINT = '/api/admin/deployment-version'"
    );
    expect(componentSource).toContain('fetch(ADMIN_DEPLOYMENT_VERSION_ENDPOINT');
    expect(componentSource).toContain("cache: 'no-store'");
    expect(componentSource).toContain("Accept: 'application/json'");
  });

  it('reloads the admin tab when the served deployment id changes', () => {
    expect(componentSource).toContain('shouldReloadForDeploymentChange');
    expect(componentSource).toContain('window.location.reload()');
    expect(componentSource).toContain("window.addEventListener('focus'");
    expect(componentSource).toContain("document.addEventListener('visibilitychange'");
    expect(componentSource).toContain('window.setInterval');
  });

  it('mounts the guard inside the admin layout with the server deployment id', () => {
    expect(layoutSource).toContain("import { getDeploymentId } from '@/lib/deployment';");
    expect(layoutSource).toContain(
      "import AdminDeploymentRefresh from './_components/AdminDeploymentRefresh';"
    );
    expect(layoutSource).toContain('const deploymentId = getDeploymentId();');
    expect(layoutSource).toContain('<AdminDeploymentRefresh deploymentId={deploymentId} />');
  });

  it('exposes the deployment version only through a no-store admin API', () => {
    expect(routeSource).toContain("import { requireAdmin } from '@/lib/auth/guards';");
    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain("import { getDeploymentId } from '@/lib/deployment';");
    expect(routeSource).toContain("{ deploymentId: getDeploymentId() }");
    expect(routeSource).toContain("'Cache-Control': 'no-store, max-age=0'");
    expect(routeSource).toContain("export const dynamic = 'force-dynamic';");
    expect(routeSource).toContain('export const revalidate = 0;');
  });
});
