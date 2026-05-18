alter table orders
  add column if not exists payment_provider text,
  add column if not exists payment_status text not null default 'not_started',
  add column if not exists payment_id text,
  add column if not exists payment_order_id text,
  add column if not exists payment_url text,
  add column if not exists payment_error text,
  add column if not exists payment_paid_at timestamptz,
  add column if not exists payment_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_payment_status_check'
  ) then
    alter table orders
      add constraint orders_payment_status_check check (
        payment_status in (
          'not_started', 'pending', 'authorized', 'confirmed',
          'failed', 'cancelled', 'refunded', 'amount_mismatch', 'unknown'
        )
      );
  end if;
end $$;

create index if not exists orders_payment_id_idx
  on orders (payment_id)
  where payment_id is not null;

create unique index if not exists orders_payment_order_id_idx
  on orders (payment_order_id)
  where payment_order_id is not null;

create index if not exists orders_owner_payment_status_idx
  on orders (owner_key, payment_status, created_at desc);
