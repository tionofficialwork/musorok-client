const crypto = require("crypto");

const tbankApiUrl =
  process.env.TBANK_ACQUIRING_API_URL || "https://securepay.tinkoff.ru/v2";
const terminalKey = process.env.TBANK_ACQUIRING_TERMINAL_KEY;
const terminalPassword = process.env.TBANK_ACQUIRING_PASSWORD;
const payType = process.env.TBANK_ACQUIRING_PAY_TYPE || "O";
const defaultSuccessUrl =
  process.env.TBANK_ACQUIRING_SUCCESS_URL ||
  "musorok://order/payment-return?result=success";
const defaultFailUrl =
  process.env.TBANK_ACQUIRING_FAIL_URL ||
  "musorok://order/payment-return?result=fail";
const notificationUrl = process.env.TBANK_ACQUIRING_NOTIFICATION_URL;
const requestTimeoutMs = Number(process.env.TBANK_ACQUIRING_TIMEOUT_MS || 15000);

function isTbankConfigured() {
  return Boolean(terminalKey && terminalPassword);
}

function isPlainTokenValue(value) {
  return (
    value !== null &&
    value !== undefined &&
    typeof value !== "object" &&
    typeof value !== "function"
  );
}

function buildToken(payload) {
  const tokenSource = {
    Password: terminalPassword,
  };

  for (const [key, value] of Object.entries(payload)) {
    if (key !== "Token" && isPlainTokenValue(value)) {
      tokenSource[key] = value;
    }
  }

  const source = Object.keys(tokenSource)
    .sort()
    .map((key) => String(tokenSource[key]))
    .join("");

  return crypto.createHash("sha256").update(source, "utf8").digest("hex");
}

function assertConfigured() {
  if (!isTbankConfigured()) {
    throw new Error("T-Bank acquiring is not configured.");
  }
}

async function callTbank(method, payload) {
  assertConfigured();

  const signedPayload = {
    TerminalKey: terminalKey,
    ...payload,
  };

  signedPayload.Token = buildToken(signedPayload);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  let response;

  try {
    response = await fetch(`${tbankApiUrl}/${method}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(signedPayload),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("T-Bank acquiring request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const contentType = response.headers.get("content-type") || "unknown";
    throw new Error(
      `T-Bank returned a non-JSON response: HTTP ${response.status}, ${contentType}.`
    );
  }

  if (!response.ok || data.Success === false) {
    const message =
      typeof data.Message === "string" && data.Message
        ? data.Message
        : typeof data.Details === "string" && data.Details
          ? data.Details
          : "T-Bank acquiring request failed.";

    throw new Error(message);
  }

  return data;
}

function appendOrderId(url, orderId) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}orderId=${encodeURIComponent(orderId)}`;
}

function rublesToKopecks(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function buildInitPayload(order) {
  const amount = rublesToKopecks(order.total);
  const orderId = String(order.id);
  const description = `Оплата заказа MusorOK #${orderId}`.slice(0, 140);

  const payload = {
    Amount: amount,
    OrderId: orderId,
    Description: description,
    CustomerKey: String(order.owner_key || "").slice(0, 36),
    PayType: payType === "T" ? "T" : "O",
    SuccessURL: appendOrderId(defaultSuccessUrl, orderId),
    FailURL: appendOrderId(defaultFailUrl, orderId),
    DATA: {
      orderId,
      paymentMethod: order.payment_method || "card",
    },
  };

  if (notificationUrl) {
    payload.NotificationURL = notificationUrl;
  }

  return payload;
}

async function initPayment(order) {
  const payload = buildInitPayload(order);
  const result = await callTbank("Init", payload);

  if (!result.PaymentId || !result.PaymentURL) {
    throw new Error("T-Bank did not return a payment URL.");
  }

  return {
    amount: payload.Amount,
    orderId: payload.OrderId,
    paymentId: String(result.PaymentId),
    paymentUrl: String(result.PaymentURL),
    status: typeof result.Status === "string" ? result.Status : "NEW",
    raw: result,
  };
}

async function getPaymentState(paymentId) {
  return callTbank("GetState", {
    PaymentId: String(paymentId),
  });
}

function verifyNotification(payload) {
  if (!isTbankConfigured() || !payload || typeof payload.Token !== "string") {
    return false;
  }

  const expectedToken = buildToken(payload);
  const actualBuffer = Buffer.from(payload.Token);
  const expectedBuffer = Buffer.from(expectedToken);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

module.exports = {
  buildToken,
  getPaymentState,
  initPayment,
  isTbankConfigured,
  rublesToKopecks,
  verifyNotification,
};
