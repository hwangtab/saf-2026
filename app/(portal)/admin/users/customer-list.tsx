'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { updateCustomerContact } from '@/app/actions/admin-customers';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
} from '@/app/admin/_components/admin-ui';
import { customerTypeLabel, type CustomerRecord } from '@/lib/admin/customer-records';
import { matchesAnySearch } from '@/lib/search-utils';
import { csvSafeCell } from '@/lib/utils/csv';

type SortKey =
  | 'name'
  | 'type'
  | 'purchaseCount'
  | 'artworkCount'
  | 'totalRevenue'
  | 'lastPurchaseDate';
type SortDirection = 'asc' | 'desc';
type ContactField = 'phone' | 'email';

type EditingState = {
  customerId: string;
  field: ContactField;
  value: string;
} | null;

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatDate(value: string | null) {
  return value ? value.slice(0, 10) : '-';
}

function formatChannels(channels: string[]) {
  return channels.length > 0 ? channels.join(' · ') : '-';
}

function customerTypeTone(type: CustomerRecord['customerType']) {
  if (type === 'member_buyer') return 'success';
  if (type === 'member_only') return 'info';
  return 'warning';
}

function buildSearchText(customer: CustomerRecord, phone: string | null, email: string | null) {
  return [
    customer.customerName,
    email,
    phone,
    ...customer.channels,
    ...customer.sales.flatMap((sale) => [sale.artworkTitle, sale.artistName]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function CustomerList({ customers }: { customers: CustomerRecord[] }) {
  const [records, setRecords] = useState(customers);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('totalRevenue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editing, setEditing] = useState<EditingState>(null);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return records;
    return records.filter((customer) =>
      matchesAnySearch(trimmed, [
        customer.customerName,
        customer.email,
        customer.phone,
        customer.searchText,
      ])
    );
  }, [records, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.customerName.localeCompare(b.customerName, 'ko');
      if (sortKey === 'type') cmp = a.customerType.localeCompare(b.customerType);
      if (sortKey === 'purchaseCount') cmp = a.purchaseCount - b.purchaseCount;
      if (sortKey === 'artworkCount') cmp = a.artworkCount - b.artworkCount;
      if (sortKey === 'totalRevenue') cmp = a.totalRevenue - b.totalRevenue;
      if (sortKey === 'lastPurchaseDate') {
        cmp = (a.lastPurchaseDate || '').localeCompare(b.lastPurchaseDate || '');
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortDirection, sortKey]);

  const totals = useMemo(
    () => ({
      members: records.filter((customer) => customer.customerType !== 'buyer_only').length,
      buyers: records.filter((customer) => customer.purchaseCount > 0).length,
      revenue: records.reduce((sum, customer) => sum + customer.totalRevenue, 0),
    }),
    [records]
  );

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(nextKey);
    setSortDirection(nextKey === 'name' || nextKey === 'type' ? 'asc' : 'desc');
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return <span className="ml-1 text-gray-300">↕</span>;
    return <span className="ml-1">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  }

  const exportCsv = useCallback(() => {
    const lines = [
      '고객명,유형,연락처,이메일,구매 수량,작품 수,총 구매액,최근 구매일,구매경로,배송상태',
    ];
    for (const customer of sorted) {
      lines.push(
        [
          customer.customerName,
          customerTypeLabel(customer.customerType),
          customer.phone || '',
          customer.email || '',
          customer.purchaseCount,
          customer.artworkCount,
          customer.totalRevenue,
          formatDate(customer.lastPurchaseDate),
          formatChannels(customer.channels),
          customer.deliverySummary,
        ]
          .map(csvSafeCell)
          .join(',')
      );
    }

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'saf2026-customers.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  const saveContact = useCallback(
    async (customer: CustomerRecord, field: ContactField, value: string) => {
      const savingKey = `${customer.id}:${field}`;
      setSavingField(savingKey);
      setEditError(null);

      try {
        const nextPhone = field === 'phone' ? value : customer.phone || '';
        const nextEmail = field === 'email' ? value : customer.email || '';
        const result = await updateCustomerContact({
          customerKey: customer.id,
          customerName: customer.customerName,
          phone: nextPhone,
          email: nextEmail,
        });

        setRecords((current) =>
          current.map((item) => {
            if (item.id !== customer.id) return item;
            const phone = result.phone;
            const email = result.email;
            return {
              ...item,
              phone,
              email,
              searchText: buildSearchText(item, phone, email),
            };
          })
        );
        setEditing(null);
      } catch (error) {
        setEditError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
      } finally {
        setSavingField(null);
      }
    },
    []
  );

  function renderContactCell(customer: CustomerRecord, field: ContactField) {
    const value = field === 'phone' ? customer.phone : customer.email;
    const isEditing = editing?.customerId === customer.id && editing.field === field;
    const savingKey = `${customer.id}:${field}`;
    const isSaving = savingField === savingKey;

    if (isEditing) {
      return (
        <div className="flex min-w-[220px] items-center gap-2">
          <input
            type={field === 'email' ? 'email' : 'tel'}
            value={editing.value}
            onChange={(event) =>
              setEditing({ customerId: customer.id, field, value: event.target.value })
            }
            className="h-8 w-36 rounded-md border border-[var(--admin-border)] bg-white px-2 text-sm text-charcoal-deep shadow-sm focus-visible:border-primary-a11y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
          />
          <button
            type="button"
            disabled={isSaving}
            onClick={() => saveContact(customer, field, editing.value)}
            className="h-8 rounded-md bg-charcoal-deep px-2 text-xs font-medium text-white transition hover:bg-charcoal-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setEditing(null);
              setEditError(null);
            }}
            className="h-8 rounded-md border border-[var(--admin-border)] bg-white px-2 text-xs font-medium text-charcoal-muted transition hover:bg-charcoal/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            취소
          </button>
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => {
          setEditing({ customerId: customer.id, field, value: value || '' });
          setEditError(null);
        }}
        className="rounded-sm text-left text-charcoal-muted underline-offset-2 hover:text-charcoal-deep hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
      >
        {value || <span className="text-primary-a11y">추가</span>}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminCard className="p-4">
          <div className="text-xs font-medium text-charcoal-soft">전체 고객</div>
          <div className="mt-1 text-2xl font-semibold text-charcoal-deep">
            {numberFormatter.format(records.length)}명
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="text-xs font-medium text-charcoal-soft">구매 고객</div>
          <div className="mt-1 text-2xl font-semibold text-charcoal-deep">
            {numberFormatter.format(totals.buyers)}명
          </div>
        </AdminCard>
        <AdminCard className="p-4">
          <div className="text-xs font-medium text-charcoal-soft">총 구매액</div>
          <div className="mt-1 text-2xl font-semibold text-charcoal-deep">
            {krwFormatter.format(totals.revenue)}
          </div>
        </AdminCard>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 전화번호, 이메일, 작품명 검색..."
          className="h-10 w-full max-w-md rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm shadow-sm transition placeholder:text-charcoal-soft focus-visible:border-primary-a11y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
        />
        <span className="text-sm text-charcoal-soft">
          {numberFormatter.format(filtered.length)}명
          {query.trim() ? ` / ${numberFormatter.format(records.length)}명` : ''}
        </span>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm font-medium text-charcoal-muted shadow-sm transition hover:bg-charcoal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25 sm:ml-auto"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          CSV
        </button>
      </div>

      <AdminCard className="overflow-hidden">
        <AdminCardHeader>
          <div>
            <h2 className="text-base font-semibold text-charcoal-deep">통합 고객 목록</h2>
            <p className="mt-1 text-xs text-charcoal-soft">
              회원 고객 {numberFormatter.format(totals.members)}명 · 비회원 구매자 포함
            </p>
            {editError && <p className="mt-2 text-xs font-medium text-danger-a11y">{editError}</p>}
          </div>
        </AdminCardHeader>

        {sorted.length === 0 ? (
          <AdminEmptyState title="고객 없음" description="검색 조건에 맞는 고객이 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[var(--admin-border-soft)]">
              <thead className="bg-charcoal/5 text-xs font-semibold uppercase text-charcoal-soft">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left"
                    onClick={() => toggleSort('name')}
                  >
                    고객명{sortIndicator('name')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left"
                    onClick={() => toggleSort('type')}
                  >
                    유형{sortIndicator('type')}
                  </th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right"
                    onClick={() => toggleSort('purchaseCount')}
                  >
                    구매 수량{sortIndicator('purchaseCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right"
                    onClick={() => toggleSort('artworkCount')}
                  >
                    작품 수{sortIndicator('artworkCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right"
                    onClick={() => toggleSort('totalRevenue')}
                  >
                    총 구매액{sortIndicator('totalRevenue')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right"
                    onClick={() => toggleSort('lastPurchaseDate')}
                  >
                    최근 구매일{sortIndicator('lastPurchaseDate')}
                  </th>
                  <th className="px-4 py-3 text-left">구매경로</th>
                  <th className="px-4 py-3 text-left">배송상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border-soft)] bg-white text-sm">
                {sorted.map((customer, index) => (
                  <tr key={customer.id} className="hover:bg-charcoal/5">
                    <td className="px-4 py-3 font-medium text-charcoal-muted">{index + 1}</td>
                    <td className="px-4 py-3 font-semibold text-charcoal-deep">
                      {customer.customerName}
                    </td>
                    <td className="px-4 py-3">
                      <AdminBadge tone={customerTypeTone(customer.customerType)}>
                        {customerTypeLabel(customer.customerType)}
                      </AdminBadge>
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">
                      {renderContactCell(customer, 'phone')}
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">
                      {renderContactCell(customer, 'email')}
                    </td>
                    <td className="px-4 py-3 text-right text-charcoal-muted">
                      {numberFormatter.format(customer.purchaseCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-charcoal-muted">
                      {numberFormatter.format(customer.artworkCount)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-charcoal-deep">
                      {krwFormatter.format(customer.totalRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-charcoal-muted">
                      {formatDate(customer.lastPurchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-charcoal-muted">
                      {formatChannels(customer.channels)}
                    </td>
                    <td className="max-w-[220px] px-4 py-3 text-charcoal-muted">
                      <span className="line-clamp-2">{customer.deliverySummary}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
