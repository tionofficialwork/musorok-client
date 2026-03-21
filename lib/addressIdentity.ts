import { supabase } from "./supabase";
import { getOwnerKey } from "./profileOwner";

const AUTH_OWNER_KEY_PREFIX = "auth_user_";

type UserAddressRow = {
  id: string;
  owner_key: string;
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

async function hasAddressesForOwnerKey(ownerKey: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_addresses")
    .select("id")
    .eq("owner_key", ownerKey)
    .limit(1);

  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

async function migrateLegacyAddressesToAuthOwnerKey(
  legacyOwnerKey: string,
  authOwnerKey: string
): Promise<void> {
  if (!legacyOwnerKey || legacyOwnerKey === authOwnerKey) {
    return;
  }

  const hasAuthAddresses = await hasAddressesForOwnerKey(authOwnerKey);

  if (hasAuthAddresses) {
    return;
  }

  const hasLegacyAddresses = await hasAddressesForOwnerKey(legacyOwnerKey);

  if (!hasLegacyAddresses) {
    return;
  }

  const { error } = await supabase
    .from("user_addresses")
    .update({ owner_key: authOwnerKey })
    .eq("owner_key", legacyOwnerKey);

  if (error) {
    throw error;
  }
}

export async function getAddressesOwnerKey(): Promise<string> {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return getOwnerKey();
  }

  const authOwnerKey = buildAuthOwnerKey(userId);
  const legacyOwnerKey = await getOwnerKey();

  await migrateLegacyAddressesToAuthOwnerKey(legacyOwnerKey, authOwnerKey);

  return authOwnerKey;
}

export default {
  getAddressesOwnerKey,
};