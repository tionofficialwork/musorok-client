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

export type OrderStatusTone = "warning" | "success" | "default";

export type ActiveOrderTimelineStep = {
  status: ActiveOrderStatus;
  label: string;
  description: string;
  meta: string;
};

type OrderStatusConfig = {
  label: string;
  tone: OrderStatusTone;
  description?: string;
  meta?: string;
};

const ORDER_STATUS_CONFIG: Record<KnownOrderStatus, OrderStatusConfig> = {
  new: {
    label: "Новый заказ",
    tone: "warning",
    description: "Заказ только что создан и уже передан в систему.",
    meta: "Заказ создан и ожидает назначения",
  },
  assigned: {
    label: "Курьер назначен",
    tone: "success",
    description: "К заказу уже привязан курьер. Скоро он начнёт движение.",
    meta: "Курьер уже назначен на заказ",
  },
  on_the_way: {
    label: "Курьер в пути",
    tone: "success",
    description: "Курьер уже едет к тебе.",
    meta: "Курьер направляется к тебе",
  },
  arrived: {
    label: "Курьер на месте",
    tone: "success",
    description: "Курьер прибыл на место и готов забрать мусор.",
    meta: "Курьер уже на месте",
  },
  done: {
    label: "Завершён",
    tone: "success",
  },
  cancelled: {
    label: "Отменён",
    tone: "warning",
  },
};

const ACTIVE_ORDER_TIMELINE: readonly ActiveOrderTimelineStep[] =
  ACTIVE_ORDER_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_CONFIG[status].label,
    description: ORDER_STATUS_CONFIG[status].description ??
      "Заказ находится в активной стадии.",
    meta:
      ORDER_STATUS_CONFIG[status].meta ?? "Следи за обновлением статуса",
  }));

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

export function isKnownOrderStatus(
  status: string | null | undefined
): status is KnownOrderStatus {
  return ALL_ORDER_STATUSES.includes(status as KnownOrderStatus);
}

export function getOrderStatusLabel(status: string | null | undefined) {
  if (!isKnownOrderStatus(status)) {
    return "Неизвестно";
  }

  return ORDER_STATUS_CONFIG[status].label;
}

export function getOrderStatusTone(
  status: string | null | undefined
): OrderStatusTone {
  if (!isKnownOrderStatus(status)) {
    return "default";
  }

  return ORDER_STATUS_CONFIG[status].tone;
}

export function getActiveOrderStatusDescription(
  status: string | null | undefined
) {
  if (!isActiveOrderStatus(status)) {
    return "Заказ находится в активной стадии.";
  }

  return (
    ORDER_STATUS_CONFIG[status].description ??
    "Заказ находится в активной стадии."
  );
}

export function getActiveOrderStatusMeta(
  status: string | null | undefined
) {
  if (!isActiveOrderStatus(status)) {
    return "Следи за обновлением статуса";
  }

  return ORDER_STATUS_CONFIG[status].meta ?? "Следи за обновлением статуса";
}

export function getActiveOrderTimelineSteps(): ActiveOrderTimelineStep[] {
  return [...ACTIVE_ORDER_TIMELINE];
}

export function getActiveOrderStatusIndex(
  status: string | null | undefined
): number {
  if (!isActiveOrderStatus(status)) {
    return -1;
  }

  return ACTIVE_ORDER_STATUSES.indexOf(status);
}

export function getCurrentActiveOrderTimelineStep(
  status: string | null | undefined
): ActiveOrderTimelineStep | null {
  if (!isActiveOrderStatus(status)) {
    return null;
  }

  return (
    ACTIVE_ORDER_TIMELINE.find((step) => step.status === status) ?? null
  );
}

export function isCompletedActiveOrderTimelineStep(
  currentStatus: string | null | undefined,
  stepStatus: ActiveOrderStatus
): boolean {
  const currentIndex = getActiveOrderStatusIndex(currentStatus);
  const stepIndex = getActiveOrderStatusIndex(stepStatus);

  if (currentIndex === -1 || stepIndex === -1) {
    return false;
  }

  return stepIndex < currentIndex;
}

export function isCurrentActiveOrderTimelineStep(
  currentStatus: string | null | undefined,
  stepStatus: ActiveOrderStatus
): boolean {
  return currentStatus === stepStatus;
}

export function isUpcomingActiveOrderTimelineStep(
  currentStatus: string | null | undefined,
  stepStatus: ActiveOrderStatus
): boolean {
  const currentIndex = getActiveOrderStatusIndex(currentStatus);
  const stepIndex = getActiveOrderStatusIndex(stepStatus);

  if (currentIndex === -1 || stepIndex === -1) {
    return false;
  }

  return stepIndex > currentIndex;
}