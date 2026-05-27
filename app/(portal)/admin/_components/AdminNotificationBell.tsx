'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { AdminNotification } from '@/app/actions/admin-notifications';

const LS_KEY = 'admin:notifications:lastSeenAt';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

const SEVERITY_DOT: Record<AdminNotification['severity'], string> = {
  info: 'bg-primary-strong',
  success: 'bg-success-a11y',
  warning: 'bg-sun-strong',
  danger: 'bg-danger-a11y',
};

interface Props {
  notifications: AdminNotification[];
}

export function AdminNotificationBell({ notifications }: Props) {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(LS_KEY);
    } catch {
      return null;
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !lastSeenAt || n.createdAt > lastSeenAt).length;

  function handleToggle() {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && notifications.length > 0) {
      const newest = notifications[0].createdAt;
      try {
        localStorage.setItem(LS_KEY, newest);
      } catch {
        // ignore
      }
      setLastSeenAt(newest);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={`알림${unreadCount > 0 ? ` (${unreadCount}건 미확인)` : ''}`}
        aria-expanded={open}
        onClick={handleToggle}
        className="relative inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-charcoal"
      >
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-a11y px-1 text-[10px] font-bold leading-none text-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          aria-label="알림"
          className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl"
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-[var(--admin-border-soft)] px-4 py-3">
            <h2 className="text-sm font-semibold text-charcoal-deep">알림</h2>
            {notifications.length > 0 && (
              <span className="text-xs text-charcoal-muted">{notifications.length}건</span>
            )}
          </div>

          {/* 목록 */}
          <div className="max-h-[min(480px,70vh)] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-10 text-center">
                <svg
                  aria-hidden="true"
                  className="mb-3 h-8 w-8 text-charcoal-soft"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p className="text-sm font-medium text-charcoal-deep">새 알림 없음</p>
                <p className="mt-1 text-xs text-charcoal-soft">
                  주요 이벤트가 발생하면 여기에 표시됩니다
                </p>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className="border-b border-[var(--admin-border-soft)] last:border-0"
                  >
                    <Link
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--admin-surface-muted)]"
                    >
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[n.severity]}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-charcoal-deep">{n.title}</p>
                        {n.detail && (
                          <p className="mt-0.5 truncate text-xs text-charcoal-muted">{n.detail}</p>
                        )}
                        <p className="mt-0.5 text-xs text-charcoal-soft">
                          {formatRelative(n.createdAt)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 푸터 */}
          <div className="border-t border-[var(--admin-border-soft)] px-4 py-2.5">
            <Link
              href="/admin/dashboard"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary-strong transition-colors hover:text-primary-a11y"
            >
              대시보드에서 전체 보기 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
