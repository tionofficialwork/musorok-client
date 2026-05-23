alter table orders
  add column if not exists completion_confirmed_at timestamptz,
  add column if not exists completion_confirmed_by text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_completion_confirmed_by_check'
  ) then
    alter table orders
      add constraint orders_completion_confirmed_by_check
        check (
          completion_confirmed_by is null
          or completion_confirmed_by in ('client', 'admin')
        );
  end if;
end $$;

create table if not exists order_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  owner_key text not null,
  kind text not null,
  content_type text not null,
  byte_size integer not null,
  image_data bytea not null,
  uploaded_by text not null,
  created_at timestamptz not null default now(),
  constraint order_photos_kind_check
    check (kind in ('client_before', 'courier_after')),
  constraint order_photos_content_type_check
    check (
      content_type in (
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      )
    ),
  constraint order_photos_byte_size_check check (byte_size > 0),
  constraint order_photos_uploaded_by_check
    check (uploaded_by in ('client', 'courier', 'admin'))
);

create unique index if not exists order_photos_order_kind_idx
  on order_photos (order_id, kind);

create index if not exists order_photos_owner_order_idx
  on order_photos (owner_key, order_id, created_at desc);
