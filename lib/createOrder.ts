import { supabase } from "./supabase";
import { syncActiveOrder } from "./activeOrder";
import { getOwnerKey } from "./profileOwner";

export type OrderStatus =
  | "new"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "done"
  | "cancelled";

export type PaymentMethod = "cash" | "card";

export type CreateOrderInput = {
  status?: OrderStatus;
  address: string;
  package_id: string;
  package_label: string;
  package_price: number;
  apartment?: string | null;
  entrance?: string | null;
  comment?: string | null;
  leave_at_door?: boolean | null;
  phone: string;
  should_call?: boolean | null;
  payment_method?: PaymentMethod | string | null;
  tip?: number | null;
  total: number;
  courier_id?: string | null;
  call_required?: boolean | null;
};

export type OrderRecord = {
  id: string | number;
  created_at: string | null;
  status: string | null;
  address: string | null;
  package_id: string | null;
  package_label: string | null;
  package_price: number | null;
  apartment: string | null;
  entrance: string | null;
  comment: string | null;
  leave_at_door: boolean | null;
  phone: string | null;
  should_call: boolean | null;
  payment_method: string | null;
  tip: number | null;
  total: number | null;
  courier_id: string | null;
  call_required: boolean | null;
  owner_key: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizePaymentMethod(value: unknown): string {
  if (value === "cash" || value === "card") {
    return value;
  }

  return "cash";
}

function normalizeStatus(value: unknown): OrderStatus {
  const allowed: OrderStatus[] = [
    "new",
    "assigned",
    "on_the_way",
    "arrived",
    "done",
    "cancelled",
  ];

  if (typeof value === "string" && allowed.includes(value as OrderStatus)) {
    return value as OrderStatus;
  }

  return "new";
}

async function buildOrderPayload(input: CreateOrderInput) {
  const address = normalizeString(input.address);
  const packageId = normalizeString(input.package_id);
  const packageLabel = normalizeString(input.package_label);
  const phone = normalizeString(input.phone);
  const ownerKey = await getOwnerKey();

  if (!address) {
    throw new Error("Address is required.");
  }

  if (!packageId) {
    throw new Error("Package id is required.");
  }

  if (!packageLabel) {
    throw new Error("Package label is required.");
  }

  if (!phone) {
    throw new Error("Phone is required.");
  }

  if (!ownerKey) {
    throw new Error("Owner key is required.");
  }

  const packagePrice = normalizeNumber(input.package_price);
  const tip = normalizeNumber(input.tip, 0);
  const total = normalizeNumber(input.total);

  if (packagePrice < 0) {
    throw new Error("Package price must be a non-negative number.");
  }

  if (tip < 0) {
    throw new Error("Tip must be a non-negative number.");
  }

  if (total < 0) {
    throw new Error("Total must be a non-negative number.");
  }

  return {
    owner_key: ownerKey,
    status: normalizeStatus(input.status),
    address,
    package_id: packageId,
    package_label: packageLabel,
    package_price: packagePrice,
    apartment: normalizeString(input.apartment) ?? "",
    entrance: normalizeString(input.entrance) ?? "",
    comment: normalizeString(input.comment) ?? "",
    leave_at_door: normalizeBoolean(input.leave_at_door, false),
    phone,
    should_call: normalizeBoolean(input.should_call, true),
    payment_method: normalizePaymentMethod(input.payment_method),
    tip,
    total,
    courier_id: normalizeString(input.courier_id),
    call_required:
      typeof input.call_required === "boolean"
        ? input.call_required
        : normalizeBoolean(input.should_call, true),
  };
}

function normalizeCreatedOrder(data: any): OrderRecord {
  return {
    id: data?.id,
    created_at: typeof data?.created_at === "string" ? data.created_at : null,
    status: typeof data?.status === "string" ? data.status : null,
    address: typeof data?.address === "string" ? data.address : null,
    package_id: typeof data?.package_id === "string" ? data.package_id : null,
    package_label:
      typeof data?.package_label === "string" ? data.package_label : null,
    package_price:
      typeof data?.package_price === "number" ? data.package_price : null,
    apartment: typeof data?.apartment === "string" ? data.apartment : null,
    entrance: typeof data?.entrance === "string" ? data.entrance : null,
    comment: typeof data?.comment === "string" ? data.comment : null,
    leave_at_door:
      typeof data?.leave_at_door === "boolean" ? data.leave_at_door : null,
    phone: typeof data?.phone === "string" ? data.phone : null,
    should_call:
      typeof data?.should_call === "boolean" ? data.should_call : null,
    payment_method:
      typeof data?.payment_method === "string" ? data.payment_method : null,
    tip: typeof data?.tip === "number" ? data.tip : null,
    total: typeof data?.total === "number" ? data.total : null,
    courier_id: typeof data?.courier_id === "string" ? data.courier_id : null,
    call_required:
      typeof data?.call_required === "boolean" ? data.call_required : null,
    owner_key: typeof data?.owner_key === "string" ? data.owner_key : null,
  };
}

export async function createOrder(input: CreateOrderInput): Promise<OrderRecord> {
  const payload = await buildOrderPayload(input);

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select(
      "id, created_at, status, address, package_id, package_label, package_price, apartment, entrance, comment, leave_at_door, phone, should_call, payment_method, tip, total, courier_id, call_required, owner_key"
    )
    .single();

  if (error) {
    throw error;
  }

  const createdOrder = normalizeCreatedOrder(data);

  await syncActiveOrder(createdOrder);

  return createdOrder;
}

export async function createAndStoreOrder(
  input: CreateOrderInput
): Promise<OrderRecord> {
  return createOrder(input);
}

export default createOrder;