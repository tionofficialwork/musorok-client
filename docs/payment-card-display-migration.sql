alter table user_payment_preferences
  add column if not exists saved_card_last4 text,
  add column if not exists saved_card_id text,
  add column if not exists saved_card_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_payment_preferences_saved_card_last4_check'
  ) then
    alter table user_payment_preferences
      add constraint user_payment_preferences_saved_card_last4_check
      check (saved_card_last4 is null or saved_card_last4 ~ '^[0-9]{4}$');
  end if;
end $$;
