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

export type OrderStatusTone =
    | "warning"
    | "info"
    | "success"
    | "danger"
    | "default";

export type ActiveOrderTimelineStep = {
  status: ActiveOrderStatus | "done";
  shortLabel: string;
  label: string;
  description: string;
  meta: string;
};

type ActiveOrderTimelineStatus = ActiveOrderTimelineStep["status"];

type OrderStatusConfig = {
  label: string;
  shortLabel: string;
  tone: OrderStatusTone;
  description?: string;
  meta?: string;
};

const ORDER_STATUS_CONFIG: Record<KnownOrderStatus, OrderStatusConfig> = {
  new: {
    label: "Новый заказ",
    shortLabel: "Создан",
    tone: "warning",
    description:
        "Заказ создан и уже передан в систему. Скоро начнётся поиск курьера.",
    meta: "Ожидаем назначения курьера",
  },
  assigned: {
    label: "Курьер назначен",
    shortLabel: "Назначен",
    tone: "info",
    description:
        "К заказу уже привязан курьер. Он готовится начать движение.",
    meta: "Курьер уже взял заказ",
  },
  on_the_way: {
    label: "Курьер в пути",
    shortLabel: "В пути",
    tone: "success",
    description: "Курьер уже едет к тебе. Скоро он будет на месте.",
    meta: "Курьер направляется по адресу",
  },
  arrived: {
    label: "Курьер на месте",
    shortLabel: "На месте",
    tone: "success",
    description: "Курьер прибыл на место и готов забрать мусор.",
    meta: "Можно завершать выполнение заказа",
  },
  done: {
    label: "Заказ завершен",
    shortLabel: "Заказ завершен",
    tone: "success",
    description: "Заказ успешно завершён.",
    meta: "Заказ перенесён в историю",
  },
  cancelled: {
    label: "Отменён",
    shortLabel: "Отменён",
    tone: "danger",
    description: "Заказ был отменён.",
    meta: "Заказ больше не активен",
  },
};

const ACTIVE_ORDER_TIMELINE: readonly ActiveOrderTimelineStep[] =
    ([...ACTIVE_ORDER_STATUSES, "done"] as ActiveOrderTimelineStatus[]).map((status) => ({
      status,
      shortLabel: ORDER_STATUS_CONFIG[status].shortLabel,
      label: ORDER_STATUS_CONFIG[status].label,
      description:
          ORDER_STATUS_CONFIG[status].description ??
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

export function getOrderStatusShortLabel(status: string | null | undefined) {
  if (!isKnownOrderStatus(status)) {
    return "Статус";
  }

  return ORDER_STATUS_CONFIG[status].shortLabel;
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

  return ACTIVE_ORDER_TIMELINE.find((step) => step.status === status) ?? null;
}

export function isCompletedActiveOrderTimelineStep(
    currentStatus: string | null | undefined,
    stepStatus: ActiveOrderStatus | "done"
): boolean {
  const currentIndex = getActiveOrderStatusIndex(currentStatus);
  const stepIndex = ACTIVE_ORDER_TIMELINE.findIndex(
      (step) => step.status === stepStatus
  );

  if (currentIndex === -1 || stepIndex === -1) {
    return false;
  }

  return stepIndex < currentIndex;
}

export function isCurrentActiveOrderTimelineStep(
    currentStatus: string | null | undefined,
    stepStatus: ActiveOrderStatus | "done"
): boolean {
  return currentStatus === stepStatus;
}

export function isUpcomingActiveOrderTimelineStep(
    currentStatus: string | null | undefined,
    stepStatus: ActiveOrderStatus | "done"
): boolean {
  const currentIndex = getActiveOrderStatusIndex(currentStatus);
  const stepIndex = ACTIVE_ORDER_TIMELINE.findIndex(
      (step) => step.status === stepStatus
  );

  if (currentIndex === -1 || stepIndex === -1) {
    return false;
  }

  return stepIndex > currentIndex;
}

export function getActiveOrderProgressValue(
    status: string | null | undefined
): number {
  const currentIndex = getActiveOrderStatusIndex(status);

  if (currentIndex === -1) {
    return 0;
  }

  return Math.round(((currentIndex + 1) / ACTIVE_ORDER_STATUSES.length) * 100);
}
