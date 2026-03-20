import fs from 'fs';
import path from 'path';
import { requireAdmin } from '@/lib/auth/guards';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { ChangelogList } from './changelog-list';
import type { ChangelogEntry } from '@/types';

const PER_PAGE = 30;

type ChangelogFilter = 'all' | 'feat' | 'fix' | 'perf';

function loadChangelog(): ChangelogEntry[] {
  try {
    const filePath = path.join(process.cwd(), 'content', 'changelog.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('[admin-changelog] Changelog loading failed:', error);
    return [];
  }
}

function parseFilter(value: string | string[] | undefined): ChangelogFilter {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === 'feat' || v === 'fix' || v === 'perf') return v;
  return 'all';
}

function parsePage(value: string | string[] | undefined): number {
  const v = Array.isArray(value) ? value[0] : value;
  const n = Number(v);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const filter = parseFilter(params.filter);
  const page = parsePage(params.page);

  const allEntries = loadChangelog();

  const filtered = filter === 'all' ? allEntries : allEntries.filter((e) => e.type === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  const paged = filtered.slice(start, start + PER_PAGE);

  const counts = {
    all: allEntries.length,
    feat: allEntries.filter((e) => e.type === 'feat').length,
    fix: allEntries.filter((e) => e.type === 'fix').length,
    perf: allEntries.filter((e) => e.type === 'perf').length,
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>개발 이력</AdminPageTitle>
        <AdminPageDescription>
          사이트 기능 업데이트, 버그 수정, 성능 개선 내역입니다. Git 커밋 기록을 기반으로 자동
          생성됩니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <ChangelogList
        entries={paged}
        filter={filter}
        page={safePage}
        totalPages={totalPages}
        totalFiltered={filtered.length}
        counts={counts}
      />
    </div>
  );
}
