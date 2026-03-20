import { supabase } from "./supabase";

type OrderRow = Record<string, unknown> & {
  id: string;
  owner_key?: string | null;
  status?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  package_label?: string | null;
  price?: number | string | null;
  package_price?: number | string | null;
  address?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  floor?: string | null;
  comment?: string | null;
  created_at?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  payment_method?: string | null;
  tip?: number | string | null;
  tip_amount?: number | string | null;
};

export type ReorderPreview = {
  id: string;
  status: string | null;
  packageName: string;
  priceLabel: string;
  addressLabel: string;
  commentLabel: string | null;
  createdAtLabel: string | null;
};

export type ReorderResult = {
  newOrderId: string;
};

const ACTIVE_ORDER_STATUSES = new Set([
  "new",
  "pending",
  "searching",
  "assigned",
  "accepted",
  "confirmed",
  "on_the_way",
  "in_progress",
]);

function getFirstString(
  ...values: Array<unknown>
): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function getFirstNumberOrString(
  ...values: Array<unknown>
): number | string | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return null;
}

function formatPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value} ₽`;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value.includes("₽") ? value : `${value} ₽`;
  }

  return "Цена не указана";
}

function buildAddressLabel(order: OrderRow) {
  const parts = [
    typeof order.address === "string" ? order.address : "",
    typeof order.entrance === "string" && order.entrance.trim().length > 0
      ? `подъезд ${order.entrance}`
      : "",
    typeof order.floor === "string" && order.floor.trim().length > 0
      ? `этаж ${order.floor}`
      : "",
    typeof order.apartment === "string" && order.apartment.trim().length > 0
      ? `кв. ${order.apartment}`
      : "",
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : "Адрес не указан";
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return null;
  }
}

function buildInsertPayload(source: OrderRow) {
  const ownerKey = getFirstString(source.owner_key);

  if (!ownerKey) {
    throw new Error("У заказа отсутствует owner_key. Повторить заказ нельзя.");
  }

  const packageId = getFirstString(source.package_id);
  const packageLabel = getFirstString(source.package_label, source.package_name);
  const packagePrice = getFirstNumberOrString(source.package_price, source.price);
  const phone = getFirstString(source.phone, source.contact_phone);
  const tip = getFirstNumberOrString(source.tip, source.tip_amount);

  const payload: Record<string, unknown> = {
    owner_key: ownerKey,
    status: "new",
  };

  if (packageId) {
    payload.package_id = packageId;
  }

  if (packageLabel) {
    payload.package_label = packageLabel;
    payload.package_name = packageLabel;
  }

  if (packagePrice !== null) {
    payload.package_price = packagePrice;
    payload.price = packagePrice;
  }

  if (typeof source.address === "string") {
    payload.address = source.address;
  }

  if (typeof source.apartment === "string") {
    payload.apartment = source.apartment;
  }

  if (typeof source.entrance === "string") {
    payload.entrance = source.entrance;
  }

  if (typeof source.floor === "string") {
    payload.floor = source.floor;
  }

  if (typeof source.comment === "string") {
    payload.comment = source.comment;
  }

  if (typeof source.leave_at_door === "boolean") {
    payload.leave_at_door = source.leave_at_door;
  }

  if (phone) {
    payload.phone = phone;
    payload.contact_phone = phone;
  }

  if (typeof source.should_call === "boolean") {
    payload.should_call = source.should_call;
  }

  if (typeof source.call_required === "boolean") {
    payload.call_required = source.call_required;
  }

  if (typeof source.payment_method === "string") {
    payload.payment_method = source.payment_method;
  }

  if (tip !== null) {
    payload.tip = tip;
    payload.tip_amount = tip;
  }

  if (typeof source.total === "number") {
    payload.total = source.total;
  }

  if (typeof source.courier_id === "string") {
    payload.courier_id = source.courier_id;
  }

  if (typeof source.lat === "number") {
    payload.lat = source.lat;
  }

  if (typeof source.lng === "number") {
    payload.lng = source.lng;
  }

  return payload;
}

async function getOrderById(orderId: string): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !data) {
    throw new Error("Не удалось загрузить исходный заказ.");
  }

  return data as OrderRow;
}

async function assertNoActiveOrder(ownerKey: string, sourceOrderId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, created_at")
    .eq("owner_key", ownerKey)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new Error("Не удалось проверить активный заказ.");
  }

  const activeOrder = (data ?? []).find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const status = typeof row.status === "string" ? row.status : "";

    if (!id || id === sourceOrderId) {
      return false;
    }

    return ACTIVE_ORDER_STATUSES.has(status);
  });

  if (activeOrder) {
    throw new Error(
      "Сейчас у пользователя уже есть активный заказ. Сначала завершите его, потом можно повторить прошлый."
    );
  }
}

export async function getReorderPreview(orderId: string): Promise<ReorderPreview> {
  const order = await getOrderById(orderId);

  const packageName =
    getFirstString(order.package_label, order.package_name) ?? "Пакет не указан";

  const priceValue = getFirstNumberOrString(order.package_price, order.price);

  return {
    id: order.id,
    status: typeof order.status === "string" ? order.status : null,
    packageName,
    priceLabel: formatPrice(priceValue),
    addressLabel: buildAddressLabel(order),
    commentLabel:
      typeof order.comment === "string" && order.comment.trim().length > 0
        ? order.comment
        : null,
    createdAtLabel: formatDate(order.created_at),
  };
}

export async function reorderPreviousOrder(orderId: string): Promise<ReorderResult> {
  const sourceOrder = await getOrderById(orderId);

  const ownerKey =
    typeof sourceOrder.owner_key === "string" && sourceOrder.owner_key.trim().length > 0
      ? sourceOrder.owner_key
      : null;

  if (!ownerKey) {
    throw new Error("У заказа отсутствует owner_key. Повторить заказ нельзя.");
  }

  await assertNoActiveOrder(ownerKey, sourceOrder.id);

  const payload = buildInsertPayload(sourceOrder);

  const { data, error } = await supabase
    .from("orders")
    .insert(payload)
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("Не удалось создать повтор заказа.");
  }

  return {
    newOrderId: data.id,
  };
}