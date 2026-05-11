import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  getOrderPayment,
  initOrderPayment,
  type OrderPayment,
} from "./payments";

export const PAYMENT_RETURN_URL = Linking.createURL("/order/payment-return");

export async function openOrderPaymentSession(
  orderId: string
): Promise<OrderPayment> {
  if (!orderId) {
    throw new Error("Не удалось определить заказ для оплаты.");
  }

  const payment = await initOrderPayment(orderId);

  if (!payment.paymentUrl) {
    throw new Error("Банк не вернул ссылку на оплату.");
  }

  await WebBrowser.openAuthSessionAsync(payment.paymentUrl, PAYMENT_RETURN_URL);

  return getOrderPayment(orderId);
}
