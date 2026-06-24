'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { createFundingProject } from '@/app/actions/admin-funding';

export default function NewProjectForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: '',
    title: '',
    summary: '',
    story: '',
    goal_amount: '',
    end_at: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldError(null);
    setError(null);

    if (!form.slug.trim() || !form.title.trim()) {
      setFieldError('슬러그와 제목은 필수 항목입니다.');
      return;
    }
    if (!(Number(form.goal_amount) > 0)) {
      setFieldError('목표 금액은 0보다 커야 합니다.');
      return;
    }

    setSaving(true);
    const res = await createFundingProject({
      slug: form.slug.trim(),
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      story: form.story.trim() || undefined,
      goal_amount: Number(form.goal_amount),
      end_at: form.end_at || undefined,
    });

    if (!res.ok) {
      setError(res.error ?? '오류가 발생했습니다.');
      setSaving(false);
      return;
    }
    router.push(`/admin/funding/${res.id}`);
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelClass = 'mb-1 block text-sm font-semibold text-charcoal-deep';
  const helperClass = 'mt-1 text-xs text-charcoal-muted';

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-2xl space-y-6">
      {(fieldError ?? error) && (
        <output className="block rounded-lg bg-canvas px-4 py-2 text-sm text-danger">
          {fieldError ?? error}
        </output>
      )}

      {/* 슬러그 */}
      <div>
        <label htmlFor="slug" className={labelClass}>
          슬러그 <span className="text-danger">*</span>
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          value={form.slug}
          onChange={handleChange}
          className={inputClass}
          placeholder="oh-yoon-terracotta"
        />
        <p className={helperClass}>URL 경로에 쓰입니다 (예: oh-yoon-terracotta)</p>
      </div>

      {/* 제목 */}
      <div>
        <label htmlFor="title" className={labelClass}>
          제목 <span className="text-danger">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          value={form.title}
          onChange={handleChange}
          className={inputClass}
          placeholder="프로젝트 제목"
        />
      </div>

      {/* 요약 */}
      <div>
        <label htmlFor="summary" className={labelClass}>
          요약
        </label>
        <textarea
          id="summary"
          name="summary"
          rows={2}
          value={form.summary}
          onChange={handleChange}
          className={inputClass}
          placeholder="한 줄 소개 (선택)"
        />
      </div>

      {/* 스토리 */}
      <div>
        <label htmlFor="story" className={labelClass}>
          본문 / 스토리
        </label>
        <textarea
          id="story"
          name="story"
          rows={6}
          value={form.story}
          onChange={handleChange}
          className={inputClass}
          placeholder="프로젝트 상세 설명 (선택)"
        />
      </div>

      {/* 목표 금액 */}
      <div>
        <label htmlFor="goal_amount" className={labelClass}>
          목표 금액(원) <span className="text-danger">*</span>
        </label>
        <input
          id="goal_amount"
          name="goal_amount"
          type="number"
          required
          min={1}
          value={form.goal_amount}
          onChange={handleChange}
          className={inputClass}
          placeholder="10000000"
        />
      </div>

      {/* 마감일 */}
      <div>
        <label htmlFor="end_at" className={labelClass}>
          마감일
        </label>
        <input
          id="end_at"
          name="end_at"
          type="date"
          value={form.end_at}
          onChange={handleChange}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-4 pt-2">
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? '저장 중…' : '프로젝트 개설'}
        </Button>
      </div>
    </form>
  );
}
