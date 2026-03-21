import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACTIVE_ORDER_STATUSES,
  INACTIVE_ORDER_STATUSES,
  isActiveOrderStatus,
  isInactiveOrderStatus,
  type ActiveOrderStatus,
  type InactiveOrderStatus,
  type KnownOrderStatus,
} from "./orderStatus";

const ACTIVE_ORDER_STORAGE_KEY = "musorok_active_order";

export {
  ACTIVE_ORDER_STATUSES,
  INACTIVE_ORDER_STATUSES,
  isActiveOrderStatus,
  isInactiveOrderStatus,
};

export type { ActiveOrderStatus, InactiveOrderStatus, KnownOrderStatus };

export type StoredActiveOrder = {
  id: string | number;
  created_at?: string | null;
  status?: string | null;
  address?: string | null;
  package_id?: string | null;
  package_label?: string | null;
  package_price?: number | null;
  apartment?: string | null;
  entrance?: string | null;
  comment?: string | null;
  leave_at_door?: boolean | null;
  phone?: string | null;
  should_call?: boolean | null;
  payment_method?: string | null;
  tip?: number | null;
  total?: number | null;
  courier_id?: string | null;
  call_required?: boolean | null;
};

function normalizeOrder(input: unknown): StoredActiveOrder | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const raw = input as Record<string, unknown>;
  const id = raw.id;

  if (
    id === null ||
    id === undefined ||
    (typeof id !== "string" && typeof id !== "number")
  ) {
    return null;
  }

  return {
    id,
    created_at: typeof raw.created_at === "string" ? raw.created_at : null,
    status: typeof raw.status === "string" ? raw.status : null,
    address: typeof raw.address === "string" ? raw.address : null,
    package_id: typeof raw.package_id === "string" ? raw.package_id : null,
    package_label:
      typeof raw.package_label === "string" ? raw.package_label : null,
    package_price:
      typeof raw.package_price === "number" ? raw.package_price : null,
    apartment: typeof raw.apartment === "string" ? raw.apartment : null,
    entrance: typeof raw.entrance === "string" ? raw.entrance : null,
    comment: typeof raw.comment === "string" ? raw.comment : null,
    leave_at_door:
      typeof raw.leave_at_door === "boolean" ? raw.leave_at_door : null,
    phone: typeof raw.phone === "string" ? raw.phone : null,
    should_call: typeof raw.should_call === "boolean" ? raw.should_call : null,
    payment_method:
      typeof raw.payment_method === "string" ? raw.payment_method : null,
    tip: typeof raw.tip === "number" ? raw.tip : null,
    total: typeof raw.total === "number" ? raw.total : null,
    courier_id: typeof raw.courier_id === "string" ? raw.courier_id : null,
    call_required:
      typeof raw.call_required === "boolean" ? raw.call_required : null,
  };
}

export function shouldPersistAsActiveOrder(
  order: Pick<StoredActiveOrder, "status"> | null | undefined
) {
  return isActiveOrderStatus(order?.status ?? null);
}

export async function getActiveOrder(): Promise<StoredActiveOrder | null> {
  try {
    const rawValue = await AsyncStorage.getItem(ACTIVE_ORDER_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsed = JSON.parse(rawValue);
    const normalized = normalizeOrder(parsed);

    if (!normalized) {
      await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      return null;
    }

    if (!shouldPersistAsActiveOrder(normalized)) {
      await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
}

export async function setActiveOrder(order: StoredActiveOrder): Promise<void> {
  const normalized = normalizeOrder(order);

  if (!normalized) {
    throw new Error("Cannot persist active order: invalid payload.");
  }

  if (!shouldPersistAsActiveOrder(normalized)) {
    await clearActiveOrder();
    return;
  }

  await AsyncStorage.setItem(
    ACTIVE_ORDER_STORAGE_KEY,
    JSON.stringify(normalized)
  );
}

export async function clearActiveOrder(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_ORDER_STORAGE_KEY);
}

export async function syncActiveOrder(
  order: StoredActiveOrder | null | undefined
): Promise<void> {
  if (!order) {
    await clearActiveOrder();
    return;
  }

  if (shouldPersistAsActiveOrder(order)) {
    await setActiveOrder(order);
    return;
  }

  await clearActiveOrder();
}

export async function updateStoredOrderStatus(
  status: string | null | undefined
): Promise<void> {
  const currentOrder = await getActiveOrder();

  if (!currentOrder) {
    return;
  }

  const nextOrder: StoredActiveOrder = {
    ...currentOrder,
    status: status ?? null,
  };

  await syncActiveOrder(nextOrder);
}

export async function hasActiveOrder(): Promise<boolean> {
  const order = await getActiveOrder();
  return Boolean(order);
}

export async function getStoredActiveOrder(): Promise<StoredActiveOrder | null> {
  return getActiveOrder();
}

export async function saveActiveOrder(order: StoredActiveOrder): Promise<void> {
  await setActiveOrder(order);
}

export async function persistActiveOrder(
  order: StoredActiveOrder | null | undefined
): Promise<void> {
  await syncActiveOrder(order);
}

export default {
  ACTIVE_ORDER_STORAGE_KEY,
  ACTIVE_ORDER_STATUSES,
  INACTIVE_ORDER_STATUSES,
  getActiveOrder,
  getStoredActiveOrder,
  setActiveOrder,
  saveActiveOrder,
  persistActiveOrder,
  syncActiveOrder,
  clearActiveOrder,
  updateStoredOrderStatus,
  hasActiveOrder,
  isActiveOrderStatus,
  isInactiveOrderStatus,
  shouldPersistAsActiveOrder,
};