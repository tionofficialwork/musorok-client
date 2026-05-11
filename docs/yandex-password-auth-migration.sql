alter table user_profiles
  add column if not exists password_hash text,
  add column if not exists password_updated_at timestamptz;

create unique index if not exists user_profiles_phone_unique_idx
  on user_profiles (phone)
  where phone is not null;
