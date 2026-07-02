'use client';

import { useEffect, useRef, useState } from 'react';

import { renderNewsletterPreview } from '@/app/actions/admin-newsletter';
import { useDebounce } from '@/lib/hooks/useDebounce';
import type { NewsletterBlock } from '@/lib/newsletter/blocks';

interface Props {
  issueNo: number;
  title: string;
  preheader: string;
  isAdvertisement: boolean;
  blocks: NewsletterBlock[];
}

// 실제 발송 렌더러(NewsletterEmail)를 서버 액션으로 호출해 iframe에 표시 — WYSIWYG 보장.
export function PreviewPane(props: Props) {
  const payload = JSON.stringify(props);
  const debounced = useDebounce(payload, 800);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    const input = JSON.parse(debounced) as Props;
    renderNewsletterPreview(input).then((result) => {
      if (reqId !== reqIdRef.current) return; // 최신 요청만 반영
      if (result.error || !result.html) {
        setError(result.message);
        return;
      }
      setError('');
      setHtml(result.html);
    });
  }, [debounced]);

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-charcoal-deep">
        실시간 미리보기 <span className="font-normal text-charcoal-muted">(실제 발송 렌더러)</span>
      </h2>
      {error && (
        <p className="rounded-lg border border-danger-a11y/40 bg-white px-3 py-2 text-sm text-danger-a11y">
          {error}
        </p>
      )}
      <iframe
        title="뉴스레터 미리보기"
        srcDoc={html}
        sandbox=""
        className="h-[720px] w-full rounded-lg border border-gray-200 bg-white"
      />
    </section>
  );
}
