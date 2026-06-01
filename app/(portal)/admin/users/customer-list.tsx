'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, X } from 'lucide-react';
import { updateCustomerContact } from '@/app/actions/admin-customers';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
} from '@/app/admin/_components/admin-ui';
import {
  buildAdminArtworkHref,
  buildMemberUserManagementHref,
  customerTypeLabel,
  formatPurchaseQuantityLabel,
  type CustomerRecord,
  type CustomerSaleSummary,
} from '@/lib/admin/customer-records';
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

function statusLabel(status: string | null) {
  if (status === 'active') return '활성';
  if (status === 'pending') return '대기';
  if (status === 'suspended') return '정지';
  return status || '-';
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
  const [selectedMemberCustomer, setSelectedMemberCustomer] = useState<CustomerRecord | null>(null);
  const [selectedPurchaseCustomer, setSelectedPurchaseCustomer] = useState<CustomerRecord | null>(
    null
  );

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

  function sortAriaValue(key: SortKey) {
    if (sortKey !== key) return 'none';
    return sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  function renderSortButton(key: SortKey, label: string, align: 'left' | 'right' = 'left') {
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className={`inline-flex w-full select-none items-center gap-1 rounded-sm text-xs font-semibold uppercase text-charcoal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25 ${
          align === 'right' ? 'justify-end text-right' : 'justify-start text-left'
        }`}
      >
        {label}
        {sortIndicator(key)}
      </button>
    );
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

  function renderCustomerType(customer: CustomerRecord) {
    const label = customerTypeLabel(customer.customerType);
    if (!customer.profileId) {
      return <AdminBadge tone={customerTypeTone(customer.customerType)}>{label}</AdminBadge>;
    }

    return (
      <button
        type="button"
        onClick={() => {
          setSelectedPurchaseCustomer(null);
          setSelectedMemberCustomer(customer);
        }}
        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
        aria-label={`${customer.customerName} 회원 데이터 보기`}
      >
        <AdminBadge
          tone={customerTypeTone(customer.customerType)}
          className="cursor-pointer transition hover:ring-primary-a11y/40"
        >
          {label}
        </AdminBadge>
      </button>
    );
  }

  function renderRevenueCell(customer: CustomerRecord) {
    const formatted = krwFormatter.format(customer.totalRevenue);
    if (customer.totalRevenue <= 0) {
      return <span>{formatted}</span>;
    }

    return (
      <button
        type="button"
        onClick={() => {
          setSelectedMemberCustomer(null);
          setSelectedPurchaseCustomer(customer);
        }}
        className="rounded-sm font-semibold text-charcoal-deep underline-offset-2 transition hover:text-primary-a11y hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
        aria-label={`${customer.customerName} 구매 내역 보기`}
      >
        {formatted}
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
                  <th className="px-4 py-3 text-left" aria-sort={sortAriaValue('name')}>
                    {renderSortButton('name', '고객명')}
                  </th>
                  <th className="px-4 py-3 text-left" aria-sort={sortAriaValue('type')}>
                    {renderSortButton('type', '유형')}
                  </th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th className="px-4 py-3 text-left">이메일</th>
                  <th className="px-4 py-3 text-right" aria-sort={sortAriaValue('purchaseCount')}>
                    {renderSortButton('purchaseCount', '구매 수량', 'right')}
                  </th>
                  <th className="px-4 py-3 text-right" aria-sort={sortAriaValue('artworkCount')}>
                    {renderSortButton('artworkCount', '작품 수', 'right')}
                  </th>
                  <th className="px-4 py-3 text-right" aria-sort={sortAriaValue('totalRevenue')}>
                    {renderSortButton('totalRevenue', '총 구매액', 'right')}
                  </th>
                  <th
                    className="px-4 py-3 text-right"
                    aria-sort={sortAriaValue('lastPurchaseDate')}
                  >
                    {renderSortButton('lastPurchaseDate', '최근 구매일', 'right')}
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
                    <td className="px-4 py-3">{renderCustomerType(customer)}</td>
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
                      {renderRevenueCell(customer)}
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

      {selectedMemberCustomer && (
        <MemberCustomerDrawer
          customer={selectedMemberCustomer}
          onClose={() => setSelectedMemberCustomer(null)}
        />
      )}

      {selectedPurchaseCustomer && (
        <CustomerPurchaseDrawer
          customer={selectedPurchaseCustomer}
          onClose={() => setSelectedPurchaseCustomer(null)}
        />
      )}
    </div>
  );
}

function CustomerPurchaseDrawer({
  customer,
  onClose,
}: {
  customer: CustomerRecord;
  onClose: () => void;
}) {
  const sortedSales = useMemo(() => sortSalesByRecent(customer.sales), [customer.sales]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-deep/35">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
        aria-label="구매 내역 패널 닫기"
        onClick={onClose}
      />
      <dialog
        open
        className="relative z-10 m-0 ml-auto flex h-full w-full max-w-2xl flex-col overflow-hidden border-0 bg-white p-0 shadow-2xl"
        aria-labelledby="customer-purchase-drawer-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border-soft)] px-5 py-4">
          <div>
            <p className="text-xs font-medium text-charcoal-soft">구매 내역</p>
            <h2
              id="customer-purchase-drawer-title"
              className="mt-1 text-xl font-semibold text-charcoal-deep"
            >
              {customer.customerName} 구매 내역
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-charcoal-muted transition hover:bg-charcoal/5 hover:text-charcoal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
            aria-label="구매 내역 패널 닫기"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold text-charcoal-deep">구매 요약</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SummaryBox label="총 구매액" value={krwFormatter.format(customer.totalRevenue)} />
              <SummaryBox
                label="구매 수량"
                value={formatPurchaseQuantityLabel(customer.purchaseCount)}
              />
              <SummaryBox
                label="작품 수"
                value={`${numberFormatter.format(customer.artworkCount)}점`}
              />
              <SummaryBox label="최근 구매일" value={formatDate(customer.lastPurchaseDate)} />
              <SummaryBox label="구매경로" value={formatChannels(customer.channels)} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-charcoal-deep">구매 작품</h3>
            {sortedSales.length === 0 ? (
              <p className="mt-3 rounded-md bg-charcoal/5 px-3 py-4 text-sm text-charcoal-soft">
                구매 이력이 없습니다.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--admin-border-soft)] rounded-md border border-[var(--admin-border-soft)]">
                {sortedSales.map((sale) => (
                  <PurchaseSaleItem key={sale.saleId} sale={sale} />
                ))}
              </div>
            )}
          </section>
        </div>
      </dialog>
    </div>
  );
}

function MemberCustomerDrawer({
  customer,
  onClose,
}: {
  customer: CustomerRecord;
  onClose: () => void;
}) {
  const userManagementHref = buildMemberUserManagementHref(customer);
  const recentSales = sortSalesByRecent(customer.sales).slice(0, 8);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-charcoal-deep/35">
      <button
        type="button"
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
        aria-label="회원 데이터 패널 닫기"
        onClick={onClose}
      />
      <dialog
        open
        className="relative z-10 m-0 ml-auto flex h-full w-full max-w-xl flex-col overflow-hidden border-0 bg-white p-0 shadow-2xl"
        aria-labelledby="member-customer-drawer-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--admin-border-soft)] px-5 py-4">
          <div>
            <p className="text-xs font-medium text-charcoal-soft">회원 데이터</p>
            <h2
              id="member-customer-drawer-title"
              className="mt-1 text-xl font-semibold text-charcoal-deep"
            >
              {customer.customerName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-charcoal-muted transition hover:bg-charcoal/5 hover:text-charcoal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
            aria-label="회원 데이터 패널 닫기"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="text-sm font-semibold text-charcoal-deep">기본 정보</h3>
            <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <InfoItem label="유형" value={customerTypeLabel(customer.customerType)} />
              <InfoItem label="상태" value={statusLabel(customer.status)} />
              <InfoItem label="이메일" value={customer.email || '-'} />
              <InfoItem label="연락처" value={customer.phone || '-'} />
              <InfoItem label="가입일" value={formatDate(customer.joinedAt)} />
              <InfoItem label="Profile ID" value={customer.profileId || '-'} mono />
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-charcoal-deep">구매 요약</h3>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryBox
                label="구매 수량"
                value={formatPurchaseQuantityLabel(customer.purchaseCount)}
              />
              <SummaryBox
                label="작품 수"
                value={`${numberFormatter.format(customer.artworkCount)}점`}
              />
              <SummaryBox label="총 구매액" value={krwFormatter.format(customer.totalRevenue)} />
              <SummaryBox label="최근 구매일" value={formatDate(customer.lastPurchaseDate)} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-charcoal-deep">구매 작품</h3>
            {recentSales.length === 0 ? (
              <p className="mt-3 rounded-md bg-charcoal/5 px-3 py-4 text-sm text-charcoal-soft">
                구매 이력이 없습니다.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--admin-border-soft)] rounded-md border border-[var(--admin-border-soft)]">
                {recentSales.map((sale) => (
                  <PurchaseSaleItem key={sale.saleId} sale={sale} compact />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-[var(--admin-border-soft)] px-5 py-4">
          {userManagementHref && (
            <Link
              href={userManagementHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-charcoal-deep px-4 text-sm font-medium text-white transition hover:bg-charcoal-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
            >
              사용자 관리에서 보기
            </Link>
          )}
        </div>
      </dialog>
    </div>
  );
}

function sortSalesByRecent(sales: CustomerSaleSummary[]) {
  return sales.slice().sort((a, b) => b.soldAt.localeCompare(a.soldAt));
}

function PurchaseSaleItem({
  sale,
  compact = false,
}: {
  sale: CustomerSaleSummary;
  compact?: boolean;
}) {
  const artworkHref = buildAdminArtworkHref(sale.artworkId);
  const title = sale.artworkTitle || '작품명 없음';

  return (
    <div className={compact ? 'px-3 py-3' : 'px-4 py-4'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {artworkHref ? (
            <Link
              href={artworkHref}
              className="font-medium text-charcoal-deep underline-offset-2 hover:text-primary-a11y hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
            >
              {title}
            </Link>
          ) : (
            <p className="font-medium text-charcoal-deep">{title}</p>
          )}
          <p className="mt-1 text-xs text-charcoal-soft">
            {[sale.artistName, sale.channel, formatDate(sale.soldAt)].filter(Boolean).join(' · ')}
          </p>
          {!compact && (
            <p className="mt-1 text-xs text-charcoal-soft">
              수량 {numberFormatter.format(sale.quantity)}점
              {sale.deliveryStatus ? ` · ${sale.deliveryStatus}` : ''}
            </p>
          )}
        </div>
        <p className="shrink-0 text-sm font-semibold text-charcoal-deep">
          {krwFormatter.format(sale.salePrice * sale.quantity)}
        </p>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md bg-charcoal/5 px-3 py-2">
      <dt className="text-xs font-medium text-charcoal-soft">{label}</dt>
      <dd
        className={`mt-1 break-all text-sm text-charcoal-deep ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[var(--admin-border-soft)] px-3 py-3">
      <div className="text-xs font-medium text-charcoal-soft">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-charcoal-deep">{value}</div>
    </div>
  );
}
