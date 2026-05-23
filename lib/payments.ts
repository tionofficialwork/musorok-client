import { api } from "./api";

export type PaymentStatus =
  | "not_started"
  | "pending"
  | "authorized"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "refunded"
  | "amount_mismatch"
  | "unknown";

export type OrderPayment = {
  orderId: string;
  paymentId: string | null;
  paymentUrl: string | null;
  status: PaymentStatus;
  providerStatus: string | null;
};

function normalizePayment(value: any): OrderPayment {
  return {
    orderId: String(value?.orderId ?? ""),
    paymentId: typeof value?.paymentId === "string" ? value.paymentId : null,
    paymentUrl: typeof value?.paymentUrl === "string" ? value.paymentUrl : null,
    status:
      typeof value?.status === "string"
        ? (value.status as PaymentStatus)
        : "unknown",
    providerStatus:
      typeof value?.providerStatus === "string" ? value.providerStatus : null,
  };
}

export async function initOrderPayment(orderId: string): Promise<OrderPayment> {
  const { payment } = await api.orders.initPayment(orderId);
  return normalizePayment(payment);
}

export async function getOrderPayment(orderId: string): Promise<OrderPayment> {
  const { payment } = await api.orders.payment(orderId);
  return normalizePayment(payment);
}

export function isPaymentSuccessful(payment: OrderPayment) {
  return isPaymentStatusSuccessful(payment.status);
}

export function isPaymentStatusSuccessful(
  status: string | null | undefined
) {
  return status === "confirmed" || status === "authorized";
}

export function canOpenPaymentForStatus(status: string | null | undefined) {
  return !["confirmed", "authorized", "refunded", "amount_mismatch"].includes(
    String(status || "not_started")
  );
}

export function getPaymentStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "confirmed":
      return "Оплачено";
    case "authorized":
      return "Оплата авторизована";
    case "pending":
      return "Банк подтверждает оплату";
    case "failed":
      return "Оплата не прошла";
    case "cancelled":
      return "Оплата отменена";
    case "refunded":
      return "Возврат выполнен";
    case "amount_mismatch":
      return "Сумма требует проверки";
    case "not_started":
      return "Оплата не начата";
    default:
      return "Статус уточняется";
  }
}
