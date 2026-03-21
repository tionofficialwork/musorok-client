import { supabase } from "./supabase";
import { getOwnerKey } from "./profileOwner";

const AUTH_OWNER_KEY_PREFIX = "auth_user_";

type UserProfileRow = {
  owner_key: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  call_allowed?: boolean | null;
  updated_at?: string | null;
};

function buildAuthOwnerKey(userId: string) {
  return `${AUTH_OWNER_KEY_PREFIX}${userId}`;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.user?.id) {
    return null;
  }

  return session.user.id;
}

async function getProfileByOwnerKey(ownerKey: string): Promise<UserProfileRow | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("owner_key, first_name, last_name, phone, call_allowed, updated_at")
    .eq("owner_key", ownerKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UserProfileRow | null) ?? null;
}

async function migrateLegacyProfileToAuthOwnerKey(
  legacyOwnerKey: string,
  authOwnerKey: string
): Promise<void> {
  if (!legacyOwnerKey || legacyOwnerKey === authOwnerKey) {
    return;
  }

  const existingAuthProfile = await getProfileByOwnerKey(authOwnerKey);

  if (existingAuthProfile) {
    return;
  }

  const legacyProfile = await getProfileByOwnerKey(legacyOwnerKey);

  if (!legacyProfile) {
    return;
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({
      owner_key: authOwnerKey,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_key", legacyOwnerKey);

  if (error) {
    throw error;
  }
}

export async function getProfileOwnerKey(): Promise<string> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return getOwnerKey();
  }

  const authOwnerKey = buildAuthOwnerKey(userId);
  const legacyOwnerKey = await getOwnerKey();

  await migrateLegacyProfileToAuthOwnerKey(legacyOwnerKey, authOwnerKey);

  return authOwnerKey;
}

export default {
  getProfileOwnerKey,
};