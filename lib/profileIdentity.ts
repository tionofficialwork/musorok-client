import { getOwnerKey } from "./profileOwner";
import { getStoredAuthOwnerKey } from "./auth";

export async function getProfileOwnerKey(): Promise<string> {
  const storedAuthOwnerKey = await getStoredAuthOwnerKey();

  if (storedAuthOwnerKey) {
    return storedAuthOwnerKey;
  }

  return getOwnerKey();
}

export default {
  getProfileOwnerKey,
};
