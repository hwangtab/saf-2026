'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { PETITION_OH_YOON_PATH, PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

const ADMIN_PATH = '/admin/petition/oh-yoon';

export interface AdminActionResult {
  ok: boolean;
  message?: string;
  rowCount?: number;
}

async function logAudit(args: {
  action:
    | 'csv_export_full'
    | 'csv_export_masked'
    | 'csv_export_committee'
    | 'force_close_campaign'
    | 'reopen_campaign'
    | 'manual_purge_pii'
    | 'delete_signature'
    | 'update_signature';
  targetType: 'campaign' | 'batch' | 'signature';
  targetId?: string | null;
  details?: Record<string, unknown>;
  actorId?: string | null;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('petition_audit_log').insert({
      petition_slug: PETITION_OH_YOON_SLUG,
      action: args.action,
      target_type: args.targetType,
      target_id: args.targetId ?? null,
      details: (args.details ?? {}) as never,
      actor_id: args.actorId ?? null,
    });
  } catch (err) {
    console.error('[petition-admin] audit log failed:', err);
  }
}

// ─── 메시지 마스킹 토글 ─────────────────────────────────────────
export async function setMessageMasked(
  signatureId: string,
  masked: boolean
): Promise<AdminActionResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('petition_signatures')
    .update({ is_masked: masked })
    .eq('id', signatureId);

  if (error) {
    console.error('[petition-admin] mask error:', error);
    return { ok: false, message: t('errorMaskFailed') };
  }
  // is_masked 트리거가 audit log를 자동 기록 (mask_message / unmask_message)
  revalidatePath(ADMIN_PATH);
  revalidatePath(PETITION_OH_YOON_PATH);
  return { ok: true };
}

// ─── 청원 강제 마감 / 재개 ────────────────────────────────────────
export async function forceCloseCampaign(): Promise<AdminActionResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc('close_petition', {
    p_slug: PETITION_OH_YOON_SLUG,
  });
  if (error) {
    console.error('[petition-admin] force_close error:', error);
    return { ok: false, message: t('errorForceCloseFailed') };
  }
  revalidatePath(ADMIN_PATH);
  revalidatePath(PETITION_OH_YOON_PATH);
  const result = data as { ok: boolean; total?: number } | null;
  return {
    ok: Boolean(result?.ok),
    rowCount: result?.total,
    message: result?.ok ? t('successForceClosed') : t('errorForceCloseFailed'),
  };
}

export async function reopenCampaign(): Promise<AdminActionResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from('petitions')
    .update({ is_active: true, closed_at: null })
    .eq('slug', PETITION_OH_YOON_SLUG);
  if (error) {
    console.error('[petition-admin] reopen error:', error);
    return { ok: false, message: t('errorReopenFailed') };
  }
  await logAudit({ action: 'reopen_campaign', targetType: 'campaign', details: {} });
  revalidatePath(ADMIN_PATH);
  revalidatePath(PETITION_OH_YOON_PATH);
  return { ok: true, message: t('successReopened') };
}

// ─── CSV 내보내기 (3종) ────────────────────────────────────────
export type CsvExportMode = 'full' | 'masked' | 'committee';

export interface CsvExportResult {
  ok: boolean;
  csv?: string;
  filename?: string;
  rowCount?: number;
  message?: string;
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(headers: string[], rows: (string | number | boolean | null)[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  for (const row of rows) lines.push(row.map(csvEscape).join(','));
  // Excel 호환을 위해 BOM 포함
  return '﻿' + lines.join('\r\n');
}

export async function exportSignaturesCsv(mode: CsvExportMode): Promise<CsvExportResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');
  const admin = createSupabaseAdminClient();

  const baseQuery = admin
    .from('petition_signatures')
    .select(
      'id, full_name, email, phone, region_top, region_sub, is_committee, message, message_public, is_masked, created_at'
    )
    .eq('petition_slug', PETITION_OH_YOON_SLUG)
    .order('created_at', { ascending: true });

  const { data, error } =
    mode === 'committee' ? await baseQuery.eq('is_committee', true) : await baseQuery;

  if (error) {
    console.error('[petition-admin] csv error:', error);
    return { ok: false, message: t('errorCsvFailed') };
  }

  const rows = data ?? [];
  const today = new Date().toISOString().slice(0, 10);

  let csv: string;
  let filename: string;

  if (mode === 'full') {
    csv = buildCsv(
      [
        '서명일',
        '성함',
        '이메일',
        '전화번호',
        '시·도',
        '시·군·구',
        '추진위원',
        '메시지',
        '공개동의',
        '마스킹',
      ],
      rows.map((r) => [
        new Date(r.created_at).toLocaleString('ko-KR'),
        r.full_name,
        r.email,
        r.phone ?? '',
        r.region_top,
        r.region_sub ?? '',
        r.is_committee ? 'Y' : '',
        r.message ?? '',
        r.message_public ? 'Y' : '',
        r.is_masked ? 'Y' : '',
      ])
    );
    filename = `petition-oh-yoon-full-${today}.csv`;
    await logAudit({
      action: 'csv_export_full',
      targetType: 'batch',
      details: { row_count: rows.length },
    });
  } else if (mode === 'masked') {
    csv = buildCsv(
      ['서명일', '시·도', '시·군·구', '추진위원여부', '메시지(공개동의분만)'],
      rows.map((r) => [
        new Date(r.created_at).toLocaleString('ko-KR'),
        r.region_top,
        r.region_sub ?? '',
        r.is_committee ? 'Y' : '',
        r.message_public && !r.is_masked ? (r.message ?? '') : '',
      ])
    );
    filename = `petition-oh-yoon-masked-${today}.csv`;
    await logAudit({
      action: 'csv_export_masked',
      targetType: 'batch',
      details: { row_count: rows.length },
    });
  } else {
    csv = buildCsv(
      ['성함', '이메일', '전화번호', '시·도', '시·군·구', '서명일'],
      rows.map((r) => [
        r.full_name,
        r.email,
        r.phone ?? '',
        r.region_top,
        r.region_sub ?? '',
        new Date(r.created_at).toLocaleString('ko-KR'),
      ])
    );
    filename = `petition-oh-yoon-committee-${today}.csv`;
    await logAudit({
      action: 'csv_export_committee',
      targetType: 'batch',
      details: { row_count: rows.length },
    });
  }

  return { ok: true, csv, filename, rowCount: rows.length };
}

// ─── 서명 삭제 (운영자 직접 조작 — 잘못된/중복 입력 정정) ───────────
export async function deleteSignature(signatureId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');

  if (!signatureId) {
    return { ok: false, message: t('errorSignatureNotFound') };
  }

  const admin = createSupabaseAdminClient();

  // 삭제 전 행을 읽어 audit log 상세에 보존
  const { data: snapshot } = await admin
    .from('petition_signatures')
    .select('id, full_name, email, region_top, region_sub, is_committee, message_public')
    .eq('id', signatureId)
    .maybeSingle();

  if (!snapshot) {
    return { ok: false, message: t('errorSignatureNotFound') };
  }

  const { error } = await admin.from('petition_signatures').delete().eq('id', signatureId);

  if (error) {
    console.error('[petition-admin] delete error:', error);
    return { ok: false, message: t('errorDeleteFailed') };
  }

  await logAudit({
    action: 'delete_signature',
    targetType: 'signature',
    targetId: signatureId,
    details: snapshot as unknown as Record<string, unknown>,
  });

  revalidatePath(ADMIN_PATH);
  revalidatePath(PETITION_OH_YOON_PATH);
  return { ok: true, message: t('successDeleted') };
}

// ─── 서명 내용 수정 (운영자 정정) ────────────────────────────────
// 보안: email은 email_hash 동기화 + unique 제약 영향 때문에 별도 흐름 필요 → 이번 버전에서는 미지원.
// 잘못된 이메일은 deleteSignature 후 재서명 안내.
export interface UpdateSignaturePatch {
  fullName?: string;
  phone?: string | null;
  regionTop?: string;
  regionSub?: string | null;
  message?: string | null;
  messagePublic?: boolean;
  isCommittee?: boolean;
  isMasked?: boolean;
}

const PHONE_DIGIT_RE = /\D+/g;

export async function updateSignature(
  signatureId: string,
  patch: UpdateSignaturePatch
): Promise<AdminActionResult> {
  await requireAdmin();
  const t = await getTranslations('admin.petition');

  if (!signatureId) {
    return { ok: false, message: t('errorSignatureNotFound') };
  }

  // 동적으로 update 객체 구성 — 명시된 필드만 반영.
  const update: Record<string, unknown> = {};
  const audited: Record<string, unknown> = {};

  if (patch.fullName !== undefined) {
    const v = patch.fullName.trim();
    if (v.length < 1 || v.length > 100) {
      return { ok: false, message: t('errorUpdateInvalidName') };
    }
    update.full_name = v;
    audited.full_name = v;
  }

  if (patch.phone !== undefined) {
    if (patch.phone === null || patch.phone.trim() === '') {
      update.phone = null;
      audited.phone = null;
    } else {
      const raw = patch.phone.trim();
      const digits = raw.replace(PHONE_DIGIT_RE, '');
      if (digits.length < 9 || digits.length > 15 || raw.length > 30) {
        return { ok: false, message: t('errorUpdateInvalidPhone') };
      }
      update.phone = raw;
      audited.phone = raw;
    }
  }

  if (patch.regionTop !== undefined) {
    update.region_top = patch.regionTop.trim();
    audited.region_top = patch.regionTop.trim();
  }
  if (patch.regionSub !== undefined) {
    update.region_sub = patch.regionSub === null ? null : patch.regionSub.trim() || null;
    audited.region_sub = update.region_sub;
  }

  if (patch.message !== undefined) {
    if (patch.message === null || patch.message.trim() === '') {
      update.message = null;
      audited.message_changed = true;
    } else {
      const m = patch.message.trim();
      if (m.length > 500) {
        return { ok: false, message: t('errorUpdateInvalidMessage') };
      }
      update.message = m;
      audited.message_changed = true;
    }
  }
  if (patch.messagePublic !== undefined) {
    update.message_public = patch.messagePublic;
    audited.message_public = patch.messagePublic;
  }
  if (patch.isCommittee !== undefined) {
    update.is_committee = patch.isCommittee;
    audited.is_committee = patch.isCommittee;
  }
  // is_masked는 트리거가 자동 audit 기록하므로 logAudit details에는 별도 표시만.
  if (patch.isMasked !== undefined) {
    update.is_masked = patch.isMasked;
  }

  if (Object.keys(update).length === 0) {
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('petition_signatures').update(update).eq('id', signatureId);

  if (error) {
    console.error('[petition-admin] update error:', error);
    return { ok: false, message: t('errorUpdateFailed') };
  }

  // is_masked만 단독 변경한 경우는 트리거가 audit 기록 → 여기서는 추가 항목이 있을 때만 explicit log.
  if (Object.keys(audited).length > 0) {
    await logAudit({
      action: 'update_signature',
      targetType: 'signature',
      targetId: signatureId,
      details: audited,
    });
  }

  revalidatePath(ADMIN_PATH);
  revalidatePath(PETITION_OH_YOON_PATH);
  return { ok: true, message: t('successUpdated') };
}
