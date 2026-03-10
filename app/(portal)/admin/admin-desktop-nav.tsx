'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { adminNavGroups } from './_components/admin-nav-items';

export function AdminDesktopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isReviewQueueMode = pathname === '/admin/users' && searchParams.get('status') === 'pending';

  return (
    <div className="hidden 2xl:ml-6 2xl:flex 2xl:items-center 2xl:gap-3">
      {adminNavGroups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-3">
          {gi > 0 && <div className="h-4 w-px bg-gray-200" aria-hidden="true" />}
          <div className="flex items-center gap-4">
            {group.items.map((item) => {
              const targetPath = item.href.split('?')[0];
              const isReviewQueueItem = item.href.includes('status=pending');
              const isUsersItem = item.href === '/admin/users';

              const isActive = isReviewQueueItem
                ? isReviewQueueMode
                : isUsersItem
                  ? pathname === '/admin/users' && !isReviewQueueMode
                  : pathname.startsWith(targetPath);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex items-center whitespace-nowrap border-b-2 px-1 pt-1 text-sm font-medium ${
                    isActive
                      ? 'border-indigo-500 text-indigo-700'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
