create table if not exists auth_sms_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  phone text not null,
  flow_mode text not null,
  password_hash text,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_sms_challenges_flow_mode_check
    check (flow_mode in ('login', 'register', 'reset_password')),
  constraint auth_sms_challenges_attempts_check check (attempts >= 0)
);

alter table auth_sms_challenges
  add column if not exists password_hash text;

alter table auth_sms_challenges
  drop constraint if exists auth_sms_challenges_flow_mode_check;

alter table auth_sms_challenges
  add constraint auth_sms_challenges_flow_mode_check
    check (flow_mode in ('login', 'register', 'reset_password'));

create index if not exists auth_sms_challenges_owner_active_idx
  on auth_sms_challenges (owner_key, consumed_at, created_at desc);

create index if not exists auth_sms_challenges_phone_created_idx
  on auth_sms_challenges (phone, created_at desc);
