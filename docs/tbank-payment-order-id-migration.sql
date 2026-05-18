alter table orders
  add column if not exists payment_order_id text;

create unique index if not exists orders_payment_order_id_idx
  on orders (payment_order_id)
  where payment_order_id is not null;
