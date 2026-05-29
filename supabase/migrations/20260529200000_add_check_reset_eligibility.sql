-- 비밀번호 재설정 자격 판정 RPC
-- server action requestPasswordReset에서 service_role로만 호출됨

create or replace function public.check_reset_eligibility(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_has_password boolean;
  v_has_google boolean;
begin
  select id into v_user_id
  from auth.users
  where lower(email) = lower(p_email)
  limit 1;

  if v_user_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  select exists(
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'email'
  ) into v_has_password;

  select exists(
    select 1 from auth.identities
    where user_id = v_user_id and provider = 'google'
  ) into v_has_google;

  if not v_has_password and v_has_google then
    return jsonb_build_object('status', 'social_only', 'provider', 'google');
  end if;

  return jsonb_build_object('status', 'eligible');
end;
$$;

revoke all on function public.check_reset_eligibility(text) from public;
revoke all on function public.check_reset_eligibility(text) from anon, authenticated;
grant execute on function public.check_reset_eligibility(text) to service_role;

comment on function public.check_reset_eligibility(text) is
  '비밀번호 재설정 자격 판정. service_role 전용. server action(requestPasswordReset)에서만 호출.';
