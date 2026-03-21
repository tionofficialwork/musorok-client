export const ACTIVE_ORDER_STATUSES = [
  "new",
  "assigned",
  "on_the_way",
  "arrived",
] as const;

export const INACTIVE_ORDER_STATUSES = ["done", "cancelled"] as const;

export const ALL_ORDER_STATUSES = [
  ...ACTIVE_ORDER_STATUSES,
  ...INACTIVE_ORDER_STATUSES,
] as const;

export type ActiveOrderStatus = (typeof ACTIVE_ORDER_STATUSES)[number];
export type InactiveOrderStatus = (typeof INACTIVE_ORDER_STATUSES)[number];
export type KnownOrderStatus = (typeof ALL_ORDER_STATUSES)[number];

export function isActiveOrderStatus(
  status: string | null | undefined
): status is ActiveOrderStatus {
  return ACTIVE_ORDER_STATUSES.includes(status as ActiveOrderStatus);
}

export function isInactiveOrderStatus(
  status: string | null | undefined
): status is InactiveOrderStatus {
  return INACTIVE_ORDER_STATUSES.includes(status as InactiveOrderStatus);
}

export function getOrderStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "new":
      return "Новый заказ";
    case "assigned":
      return "Курьер назначен";
    case "on_the_way":
      return "Курьер в пути";
    case "arrived":
      return "Курьер на месте";
    case "done":
      return "Завершён";
    case "cancelled":
      return "Отменён";
    default:
      return "Неизвестно";
  }
}

export function getOrderStatusTone(
  status: string | null | undefined
): "warning" | "success" | "default" {
  switch (status) {
    case "new":
      return "warning";
    case "assigned":
    case "on_the_way":
    case "arrived":
    case "done":
      return "success";
    case "cancelled":
      return "warning";
    default:
      return "default";
  }
}

export function getActiveOrderStatusDescription(
  status: string | null | undefined
) {
  switch (status) {
    case "new":
      return "Заказ только что создан и уже передан в систему.";
    case "assigned":
      return "К заказу уже привязан курьер. Скоро он начнёт движение.";
    case "on_the_way":
      return "Курьер уже едет к тебе.";
    case "arrived":
      return "Курьер прибыл на место и готов забрать мусор.";
    default:
      return "Заказ находится в активной стадии.";
  }
}

export function getActiveOrderStatusMeta(
  status: string | null | undefined
) {
  switch (status) {
    case "new":
      return "Заказ создан и ожидает назначения";
    case "assigned":
      return "Курьер уже назначен на заказ";
    case "on_the_way":
      return "Курьер направляется к тебе";
    case "arrived":
      return "Курьер уже на месте";
    default:
      return "Следи за обновлением статуса";
  }
}