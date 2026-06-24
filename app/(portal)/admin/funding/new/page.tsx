import { requireAdmin } from '@/lib/auth/guards';
import NewProjectForm from './NewProjectForm';

export const dynamic = 'force-dynamic';

export default async function AdminFundingNewPage() {
  await requireAdmin();
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-charcoal-deep">새 펀딩 프로젝트</h1>
      <NewProjectForm />
    </div>
  );
}
