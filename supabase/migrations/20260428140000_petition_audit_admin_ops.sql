-- ============================================================
-- Migration: petition_audit_log.action에 운영자 직접 조작 액션 추가
--
-- 배경: 관리자 페이지에서 서명 행을 직접 삭제·수정하는 기능을 도입.
-- 기존 enum에는 mask/unmask, csv export, mail, campaign 제어만 있었음.
-- ============================================================

ALTER TABLE public.petition_audit_log
  DROP CONSTRAINT IF EXISTS petition_audit_log_action_check;

ALTER TABLE public.petition_audit_log
  ADD CONSTRAINT petition_audit_log_action_check
    CHECK (action IN (
      'mask_message',
      'unmask_message',
      'delete_message',
      'csv_export_full',
      'csv_export_masked',
      'csv_export_committee',
      'mail_send_milestone',
      'mail_send_d1',
      'mail_send_result',
      'mail_send_committee',
      'force_close_campaign',
      'reopen_campaign',
      'manual_purge_pii',
      'delete_signature',
      'update_signature'
    ));
