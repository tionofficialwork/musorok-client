create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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
