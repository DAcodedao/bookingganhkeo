-- Run once in Supabase Dashboard -> SQL Editor.
-- The password is stored as a bcrypt hash, never as readable text.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.delete_password_config (
  singleton boolean primary key default true check (singleton),
  password_hash text not null,
  updated_at timestamptz not null default now()
);

alter table public.delete_password_config enable row level security;
revoke all on public.delete_password_config from public, anon, authenticated;

drop function if exists public.set_delete_password(text, text);
create function public.set_delete_password(p_current_password text, p_new_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hash text;
begin
  if auth.uid() is null then
    raise exception 'Vui lòng đăng nhập để đổi mật khẩu.';
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Mật khẩu mới cần có ít nhất 8 ký tự.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(731946205);
  select password_hash into current_hash
  from public.delete_password_config
  where singleton = true
  for update;

  if current_hash is null then
    if coalesce(p_current_password, '') <> '' then
      raise exception 'Chưa thiết lập mật khẩu xoá dữ liệu. Để trống mật khẩu hiện tại.';
    end if;
  elsif p_current_password is null
     or extensions.crypt(p_current_password, current_hash) <> current_hash then
    raise exception 'Mật khẩu hiện tại không đúng.';
  end if;

  insert into public.delete_password_config (singleton, password_hash, updated_at)
  values (true, extensions.crypt(p_new_password, extensions.gen_salt('bf', 12)), now())
  on conflict (singleton) do update
    set password_hash = excluded.password_hash,
        updated_at = excluded.updated_at;
end;
$$;

create or replace function public.reset_all_app_data(p_password text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_hash text;
begin
  if auth.uid() is null then
    raise exception 'Vui lòng đăng nhập để xoá dữ liệu.';
  end if;

  select password_hash into current_hash
  from public.delete_password_config
  where singleton = true;

  if current_hash is null then
    raise exception 'Chưa thiết lập mật khẩu xoá dữ liệu. Hãy thiết lập trong Cài đặt trước.';
  end if;
  if p_password is null
     or extensions.crypt(p_password, current_hash) <> current_hash then
    raise exception 'Mật khẩu xoá dữ liệu không đúng.';
  end if;

  delete from public.bookings where true;
  delete from public.walk_ins where true;
  delete from public.booking_history where true;
  delete from public.table_groups where true;
end;
$$;

revoke all on function public.set_delete_password(text, text) from public, anon;
revoke all on function public.reset_all_app_data(text) from public, anon;
grant execute on function public.set_delete_password(text, text) to authenticated;
grant execute on function public.reset_all_app_data(text) to authenticated;

-- Forgot the password? Run this in SQL Editor with a new password (8+ characters).
-- It replaces the stored hash; the old password cannot be recovered.
-- insert into public.delete_password_config (singleton, password_hash, updated_at)
-- values (true, extensions.crypt('REPLACE_WITH_NEW_PASSWORD', extensions.gen_salt('bf', 12)), now())
-- on conflict (singleton) do update
--   set password_hash = excluded.password_hash,
--       updated_at = excluded.updated_at;
