import createOrder from "./createOrder";
import { api } from "./api";
import { cleanAddressForDisplay } from "./addressDisplay";
import { ACTIVE_ORDER_STATUSES } from "./orderStatus";

type OrderRow = Record<string, unknown> & {
  id: string | number;
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
  intercom?: string | null;
  address_label?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  comment?: string | null;
  created_at?: string | null;
  phone?: string | null;
  contact_phone?: string | null;
  payment_method?: string | null;
  tip?: number | string | null;
  tip_amount?: number | string | null;
  leave_at_door?: boolean | null;
  should_call?: boolean | null;
  call_required?: boolean | null;
  total?: number | string | null;
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

const ACTIVE_ORDER_STATUS_SET = new Set<string>(ACTIVE_ORDER_STATUSES);

function getFirstString(...values: Array<unknown>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function getFirstFiniteNumber(...values: Array<unknown>): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
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
    cleanAddressForDisplay(order.address),
    typeof order.entrance === "string" && order.entrance.trim().length > 0
        ? `подъезд ${order.entrance}`
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

async function getOrderById(orderId: string): Promise<OrderRow> {
  const [{ orders }, { order: activeOrder }] = await Promise.all([
    api.orders.history(),
    api.orders.active(),
  ]);
  const data = [...orders, activeOrder].find(
    (order) => order && String(order.id) === orderId
  );

  if (!data) {
    throw new Error("Не удалось загрузить исходный заказ.");
  }

  return data as OrderRow;
}

async function assertNoActiveOrder(sourceOrderId: string) {
  const { order: activeOrder } = await api.orders.active();
  const id =
    typeof activeOrder?.id === "string" || typeof activeOrder?.id === "number"
      ? String(activeOrder.id)
      : "";
  const status = typeof activeOrder?.status === "string" ? activeOrder.status : "";

  if (id && id !== sourceOrderId && ACTIVE_ORDER_STATUS_SET.has(status)) {
    throw new Error(
        "Сейчас у пользователя уже есть активный заказ. Сначала завершите его, потом можно повторить прошлый."
    );
  }
}

export async function getReorderPreview(orderId: string): Promise<ReorderPreview> {
  const order = await getOrderById(orderId);

  const packageName =
      getFirstString(order.package_label, order.package_name) ?? "Пакет не указан";

  const priceValue =
      getFirstFiniteNumber(order.package_price, order.price) ??
      getFirstString(order.package_price, order.price);

  return {
    id: String(order.id),
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

  await assertNoActiveOrder(String(sourceOrder.id));

  const packageId = getFirstString(sourceOrder.package_id);
  const packageLabel = getFirstString(
      sourceOrder.package_label,
      sourceOrder.package_name
  );
  const address = getFirstString(sourceOrder.address);
  const phone = getFirstString(sourceOrder.phone, sourceOrder.contact_phone);

  if (!packageId || !packageLabel || !address || !phone) {
    throw new Error(
        "В исходном заказе не хватает данных для повтора. Нужны пакет, адрес и телефон."
    );
  }

  const packagePrice = getFirstFiniteNumber(
      sourceOrder.package_price,
      sourceOrder.price
  );

  if (packagePrice === null || packagePrice < 0) {
    throw new Error("Не удалось определить стоимость пакета для повтора заказа.");
  }

  const tip = getFirstFiniteNumber(sourceOrder.tip, sourceOrder.tip_amount) ?? 0;
  const total = packagePrice + tip;

  const createdOrder = await createOrder({
    status: "new",
    address,
    package_id: packageId,
    package_label: packageLabel,
    package_price: packagePrice,
    apartment: getFirstString(sourceOrder.apartment),
    entrance: getFirstString(sourceOrder.entrance),
    floor: getFirstString(sourceOrder.floor),
    intercom: getFirstString(sourceOrder.intercom),
    address_label: getFirstString(sourceOrder.address_label),
    latitude: sourceOrder.latitude ?? null,
    longitude: sourceOrder.longitude ?? null,
    comment: getFirstString(sourceOrder.comment),
    leave_at_door:
        typeof sourceOrder.leave_at_door === "boolean"
            ? sourceOrder.leave_at_door
            : false,
    phone,
    should_call:
        typeof sourceOrder.should_call === "boolean"
            ? sourceOrder.should_call
            : typeof sourceOrder.call_required === "boolean"
                ? sourceOrder.call_required
                : true,
    payment_method:
        sourceOrder.payment_method === "sbp" ? "sbp" : "card",
    tip,
    total,
    call_required:
        typeof sourceOrder.call_required === "boolean"
            ? sourceOrder.call_required
            : typeof sourceOrder.should_call === "boolean"
                ? sourceOrder.should_call
                : true,
  });

  return {
    newOrderId: String(createdOrder.id),
  };
}
