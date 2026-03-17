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

function loadChangelog(): ChangelogEntry[] {
  try {
    const filePath = path.join(process.cwd(), 'content', 'changelog.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default async function ChangelogPage() {
  await requireAdmin();
  const entries = loadChangelog();

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>개발 이력</AdminPageTitle>
        <AdminPageDescription>
          사이트 기능 업데이트, 버그 수정, 성능 개선 내역입니다. Git 커밋 기록을 기반으로 자동
          생성됩니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <ChangelogList entries={entries} />
    </div>
  );
}
