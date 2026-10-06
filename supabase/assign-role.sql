-- Replace the email with an existing Supabase Auth user before running.
-- Run this once for the account that should manage the restaurant.
insert into public.user_roles (user_id, role)
select id, 'manager'
from auth.users
where lower(email) = lower('admin@gmail.com')
on conflict (user_id) do update set role = excluded.role;

select users.email, roles.role
from public.user_roles as roles
join auth.users as users on users.id = roles.user_id
where lower(users.email) = lower('admin@gmail.com');

-- For staff accounts, change 'manager' above to 'employee'.
