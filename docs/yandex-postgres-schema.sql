create table if not exists user_profiles (
  owner_key text primary key,
  first_name text,
  last_name text,
  phone text,
  password_hash text,
  password_updated_at timestamptz,
  call_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_profiles_phone_unique_idx
  on user_profiles (phone)
  where phone is not null;

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

create index if not exists auth_sms_challenges_owner_active_idx
  on auth_sms_challenges (owner_key, consumed_at, created_at desc);

create index if not exists auth_sms_challenges_phone_created_idx
  on auth_sms_challenges (phone, created_at desc);

create table if not exists user_addresses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_key text not null,
  label text not null default 'Дом',
  street text not null,
  apartment text,
  entrance text,
  floor text,
  comment text,
  is_primary boolean not null default false,
  latitude numeric(10, 7),
  longitude numeric(10, 7)
);

create index if not exists user_addresses_owner_key_idx
  on user_addresses (owner_key);

create index if not exists user_addresses_owner_primary_idx
  on user_addresses (owner_key, is_primary desc, created_at desc);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_key text not null,
  status text not null default 'new',
  address text not null,
  package_id text not null,
  package_label text not null,
  package_price integer not null default 0,
  apartment text,
  entrance text,
  floor text,
  intercom text,
  address_label text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  comment text,
  leave_at_door boolean not null default false,
  phone text not null,
  should_call boolean not null default true,
  payment_method text not null default 'card',
  payment_provider text,
  payment_status text not null default 'not_started',
  payment_id text,
  payment_order_id text,
  payment_url text,
  payment_error text,
  payment_paid_at timestamptz,
  payment_updated_at timestamptz,
  tip integer not null default 0,
  total integer not null default 0,
  courier_id text,
  call_required boolean not null default true,
  constraint orders_status_check check (
    status in ('new', 'assigned', 'on_the_way', 'arrived', 'done', 'cancelled')
  ),
  constraint orders_payment_method_check check (payment_method in ('card', 'sbp')),
  constraint orders_payment_status_check check (
    payment_status in (
      'not_started', 'pending', 'authorized', 'confirmed',
      'failed', 'cancelled', 'refunded', 'amount_mismatch', 'unknown'
    )
  ),
  constraint orders_package_price_check check (package_price >= 0),
  constraint orders_tip_check check (tip >= 0),
  constraint orders_total_check check (total >= 0)
);

create index if not exists orders_owner_created_at_idx
  on orders (owner_key, created_at desc);

create index if not exists orders_owner_status_created_at_idx
  on orders (owner_key, status, created_at desc);

create unique index if not exists orders_payment_order_id_idx
  on orders (payment_order_id)
  where payment_order_id is not null;

create table if not exists user_payment_preferences (
  owner_key text primary key,
  default_method text not null default 'card',
  allow_cash boolean not null default false,
  allow_card boolean not null default true,
  default_tip integer not null default 0,
  ask_before_changing_method boolean not null default false,
  saved_card_last4 text,
  saved_card_id text,
  saved_card_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_payment_preferences_default_method_check
    check (default_method in ('card', 'sbp')),
  constraint user_payment_preferences_default_tip_check check (default_tip >= 0),
  constraint user_payment_preferences_saved_card_last4_check
    check (saved_card_last4 is null or saved_card_last4 ~ '^[0-9]{4}$')
);

create table if not exists user_notification_preferences (
  owner_key text primary key,
  order_updates_enabled boolean not null default true,
  promotions_enabled boolean not null default false,
  reminders_enabled boolean not null default true,
  system_enabled boolean not null default true,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start text not null default '22:00',
  quiet_hours_end text not null default '09:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_notification_preferences_quiet_hours_start_check
    check (quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  constraint user_notification_preferences_quiet_hours_end_check
    check (quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists user_profiles_set_updated_at on user_profiles;
create trigger user_profiles_set_updated_at
before update on user_profiles
for each row execute function set_updated_at();

drop trigger if exists user_addresses_set_updated_at on user_addresses;
create trigger user_addresses_set_updated_at
before update on user_addresses
for each row execute function set_updated_at();

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
before update on orders
for each row execute function set_updated_at();

drop trigger if exists user_payment_preferences_set_updated_at
  on user_payment_preferences;
create trigger user_payment_preferences_set_updated_at
before update on user_payment_preferences
for each row execute function set_updated_at();

drop trigger if exists user_notification_preferences_set_updated_at
  on user_notification_preferences;
create trigger user_notification_preferences_set_updated_at
before update on user_notification_preferences
for each row execute function set_updated_at();

create table if not exists user_push_tokens (
  token text primary key,
  owner_key text not null,
  platform text not null default 'unknown',
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_push_tokens_platform_check
    check (platform in ('ios', 'android', 'unknown'))
);

create index if not exists user_push_tokens_owner_key_idx
  on user_push_tokens (owner_key, updated_at desc);

drop trigger if exists user_push_tokens_set_updated_at
  on user_push_tokens;
create trigger user_push_tokens_set_updated_at
before update on user_push_tokens
for each row execute function set_updated_at();
