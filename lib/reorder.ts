import { supabase } from "./supabase";

type OrderRow = Record<string, unknown> & {
  id: string;
  owner_key?: string | null;
  status?: string | null;
  package_id?: string | null;
  package_name?: string | null;
  price?: number | string | null;
  address?: string | null;
  apartment?: string | null;
  entrance?: string | null;
  floor?: string | null;
  comment?: string | null;
  created_at?: string | null;
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

const COPYABLE_FIELDS = [
  "owner_key",
  "package_id",
  "package_name",
  "price",
  "address",
  "apartment",
  "entrance",
  "floor",
  "comment",
  "contact_name",
  "contact_phone",
  "payment_method",
  "tip_amount",
  "lat",
  "lng",
] as const;

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

function getSafeString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function pickCopyableFields(source: OrderRow) {
  const payload: Record<string, unknown> = {};

  for (const field of COPYABLE_FIELDS) {
    if (field in source) {
      const value = source[field];

      if (value !== undefined) {
        payload[field] = value;
      }
    }
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

  return {
    id: order.id,
    status: typeof order.status === "string" ? order.status : null,
    packageName: getSafeString(order.package_name, "Пакет не указан"),
    priceLabel: formatPrice(order.price),
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

  const payload = pickCopyableFields(sourceOrder);

  payload.owner_key = ownerKey;
  payload.status = "new";

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