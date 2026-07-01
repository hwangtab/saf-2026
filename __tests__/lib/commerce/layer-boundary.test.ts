describe('commerce layer boundaries', () => {
  it('does not import App Router actions from lib/commerce modules', () => {
    const fs = jest.requireActual('node:fs') as typeof import('node:fs');
    const path = jest.requireActual('node:path') as typeof import('node:path');
    const commerceRoot = path.join(process.cwd(), 'lib/commerce');

    function listTypeScriptFiles(dir: string): string[] {
      return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) return listTypeScriptFiles(fullPath);
        return entry.isFile() && fullPath.endsWith('.ts') ? [fullPath] : [];
      });
    }

    const violations = listTypeScriptFiles(commerceRoot)
      .map((file) => ({
        file: path.relative(process.cwd(), file),
        source: fs.readFileSync(file, 'utf8'),
      }))
      .filter(({ source }) => source.includes("from '@/app/") || source.includes('from "@/app/'))
      .map(({ file }) => file);

    expect(violations).toEqual([]);
  });
});
