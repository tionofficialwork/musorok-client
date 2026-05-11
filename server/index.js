require("dotenv").config();

const crypto = require("crypto");
const cors = require("cors");
const express = require("express");
const { query } = require("./db");
const { getOrderPackage, getOrderPackageLabel } = require("./orderCatalog");
const { isExpoPushToken, sendExpoPushMessages } = require("./pushNotifications");
const { sendAuthCodeSms } = require("./sms");
const {
  getPaymentState,
  initPayment,
  rublesToKopecks,
  verifyNotification,
} = require("./tbank");

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const authSecret = process.env.API_AUTH_SECRET;
const authSmsCodeTtlMinutes = Number(process.env.AUTH_SMS_CODE_TTL_MINUTES || 10);
const authSmsMaxAttempts = Number(process.env.AUTH_SMS_MAX_ATTEMPTS || 5);
const authSmsMaxSendsPerWindow = Number(
  process.env.AUTH_SMS_MAX_SENDS_PER_WINDOW || 5
);
const authSmsSendWindowMinutes = Number(
  process.env.AUTH_SMS_SEND_WINDOW_MINUTES || 15
);
const authTokenTtlDays = Number(process.env.AUTH_TOKEN_TTL_DAYS || 180);
const maxOrderTip = Number(process.env.MAX_ORDER_TIP_RUBLES || 1000);
const adminToken = process.env.API_ADMIN_TOKEN || "";
const isProduction =
  process.env.NODE_ENV === "production" || process.env.API_ENV === "production";
const allowedCorsOrigins = String(process.env.API_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (!authSecret || authSecret.length < 32) {
  throw new Error("API_AUTH_SECRET must be set and contain at least 32 characters.");
}

if (isProduction && process.env.AUTH_SMS_DEBUG_CODE_ENABLED === "true") {
  throw new Error("AUTH_SMS_DEBUG_CODE_ENABLED must be disabled in production.");
}

if (isProduction && adminToken && adminToken.length < 32) {
  throw new Error("API_ADMIN_TOKEN must contain at least 32 characters.");
}

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.set("Cross-Origin-Resource-Policy", "same-site");
  res.set("Referrer-Policy", "no-referrer");
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  next();
});
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (allowedCorsOrigins.length === 0) {
      callback(null, !isProduction);
      return;
    }

    callback(null, allowedCorsOrigins.includes(origin));
  },
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const withoutPrefix =
    digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))
      ? digits.slice(1)
      : digits;

  if (withoutPrefix.length !== 10) {
    return null;
  }

  return `+7${withoutPrefix}`;
}

function ownerKeyFromPhone(phone) {
  return `phone_user_${phone.replace(/\D/g, "")}`;
}

function buildAuthToken(ownerKey) {
  const payload = Buffer.from(
    JSON.stringify({
      ownerKey,
      issuedAt: Date.now(),
    })
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", authSecret)
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

function getAuthTokenTtlMs() {
  const ttlDays =
    Number.isFinite(authTokenTtlDays) && authTokenTtlDays > 0
      ? authTokenTtlDays
      : 180;

  return ttlDays * 24 * 60 * 60 * 1000;
}

function getAuthOwnerKey(req) {
  const header = req.header("x-musorok-token") || "";
  const token = header.trim();

  if (!token) {
    return null;
  }

  try {
    const [payload, signature] = token.split(".");
    const expectedSignature = crypto
      .createHmac("sha256", authSecret)
      .update(payload || "")
      .digest("base64url");

    if (
      !payload ||
      !signature ||
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    ) {
      return null;
    }

    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const issuedAt = Number(parsed.issuedAt);

    if (
      !Number.isFinite(issuedAt) ||
      issuedAt <= 0 ||
      Date.now() - issuedAt > getAuthTokenTtlMs()
    ) {
      return null;
    }

    return typeof parsed.ownerKey === "string" ? parsed.ownerKey : null;
  } catch {
    return null;
  }
}

function validatePassword(value) {
  const password = String(value || "");

  if (password.length < 8) {
    return "Пароль должен быть не короче 8 символов.";
  }

  if (!/[A-Za-zА-Яа-яЁё]/.test(password) || !/\d/.test(password)) {
    return "Пароль должен содержать буквы и цифры.";
  }

  return null;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const iterations = 210000;
  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("base64url");

  return `pbkdf2_sha256$${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") {
    return false;
  }

  const [algorithm, iterationsValue, salt, expectedHash] = storedHash.split("$");
  const iterations = Number(iterationsValue);

  if (
    algorithm !== "pbkdf2_sha256" ||
    !Number.isFinite(iterations) ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const actualHash = crypto
    .pbkdf2Sync(password, salt, iterations, 32, "sha256")
    .toString("base64url");
  const actualBuffer = Buffer.from(actualHash);
  const expectedBuffer = Buffer.from(expectedHash);

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function generateSmsCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashSmsCode(challengeId, code) {
  return crypto
    .createHmac("sha256", authSecret)
    .update(`${challengeId}:${code}`)
    .digest("base64url");
}

function timingSafeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function timingSafeTokenEqual(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  return timingSafeStringEqual(actual, expected);
}

function getAuthSmsExpiresAt() {
  const ttlMinutes =
    Number.isFinite(authSmsCodeTtlMinutes) && authSmsCodeTtlMinutes > 0
      ? authSmsCodeTtlMinutes
      : 10;

  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

function getPositiveNumber(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeProfile(row) {
  if (!row) {
    return null;
  }

  return {
    owner_key: row.owner_key,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    call_allowed: row.call_allowed,
    updated_at: row.updated_at,
  };
}

function mapTbankStatus(status) {
  switch (String(status || "").toUpperCase()) {
    case "CONFIRMED":
      return "confirmed";
    case "AUTHORIZED":
      return "authorized";
    case "NEW":
    case "FORM_SHOWED":
    case "3DS_CHECKING":
    case "3DS_CHECKED":
      return "pending";
    case "CANCELED":
      return "cancelled";
    case "REFUNDED":
    case "PARTIAL_REFUNDED":
      return "refunded";
    case "REJECTED":
    case "AUTH_FAIL":
    case "DEADLINE_EXPIRED":
      return "failed";
    default:
      return "unknown";
  }
}

function isPaidTbankStatus(status) {
  return ["AUTHORIZED", "CONFIRMED"].includes(String(status || "").toUpperCase());
}

const ORDER_STATUS_LABELS = {
  new: "Заказ создан",
  assigned: "Курьер назначен",
  on_the_way: "Курьер в пути",
  arrived: "Курьер на месте",
  done: "Заказ выполнен",
  cancelled: "Заказ отменён",
};
const ORDER_STATUS_TRANSITIONS = {
  new: ["assigned", "cancelled"],
  assigned: ["on_the_way", "cancelled"],
  on_the_way: ["arrived", "cancelled"],
  arrived: ["done", "cancelled"],
  done: [],
  cancelled: [],
};

function isOrderStatus(value) {
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABELS, value);
}

function getOrderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || "Статус заказа изменился";
}

function assertOrderStatusTransition(currentStatus, nextStatus) {
  if (!isOrderStatus(nextStatus)) {
    throw createHttpError("Некорректный статус заказа.", 400);
  }

  if (currentStatus === nextStatus) {
    return;
  }

  const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    throw createHttpError("Недопустимый переход статуса заказа.", 409);
  }
}

function minutesFromTime(value) {
  const [hours, minutes] = String(value || "").split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function isQuietHoursNow(start, end) {
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);

  if (startMinutes === null || endMinutes === null || startMinutes === endMinutes) {
    return false;
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

async function notifyOrderStatusUpdate(order) {
  if (!order?.owner_key || !order?.id || !order?.status) {
    return;
  }

  const preferencesResult = await query(
    `select order_updates_enabled, system_enabled, quiet_hours_enabled,
            quiet_hours_start, quiet_hours_end
     from user_notification_preferences
     where owner_key = $1
     limit 1`,
    [order.owner_key]
  );
  const preferences = preferencesResult.rows[0];

  if (
    preferences &&
    (preferences.system_enabled === false ||
      preferences.order_updates_enabled === false ||
      (preferences.quiet_hours_enabled === true &&
        isQuietHoursNow(preferences.quiet_hours_start, preferences.quiet_hours_end)))
  ) {
    return;
  }

  const tokensResult = await query(
    `select token
     from user_push_tokens
     where owner_key = $1
     order by updated_at desc
     limit 20`,
    [order.owner_key]
  );
  const tokens = tokensResult.rows
    .map((row) => row.token)
    .filter((token) => isExpoPushToken(token));

  if (tokens.length === 0) {
    return;
  }

  const statusLabel = getOrderStatusLabel(order.status);
  const body = order.package_label
    ? `${order.package_label}: ${statusLabel}`
    : statusLabel;

  try {
    await sendExpoPushMessages(tokens.map((token) => ({
      to: token,
      sound: "default",
      title: "Статус заказа изменился",
      body,
      data: {
        orderId: String(order.id),
        status: order.status,
      },
    })));
  } catch (error) {
    console.error("Failed to send order status push", error);
  }
}

async function updateOrderPaymentState({
  orderId,
  ownerKey,
  paymentId,
  status,
  amount,
  paymentUrl,
  error,
}) {
  const paymentStatus = mapTbankStatus(status);
  const paidAt = paymentStatus === "confirmed" ? "now()" : "payment_paid_at";
  const params = [
    paymentStatus,
    paymentId || null,
    paymentUrl || null,
    error || null,
    orderId,
  ];
  const ownerClause = ownerKey ? "and owner_key = $6" : "";

  if (ownerKey) {
    params.push(ownerKey);
  }

  const result = await query(
    `update orders
     set payment_provider = 'tbank',
         payment_status = $1,
         payment_id = coalesce($2, payment_id),
         payment_url = coalesce($3, payment_url),
         payment_error = $4,
         payment_paid_at = ${paidAt},
         payment_updated_at = now()
     where id = $5 ${ownerClause}
     returning *`,
    params
  );

  const order = result.rows[0] ?? null;

  if (
    order &&
    amount !== undefined &&
    Number(amount) !== rublesToKopecks(order.total)
  ) {
    const mismatchResult = await query(
      `update orders
       set payment_status = 'amount_mismatch',
           payment_error = 'T-Bank amount mismatch',
           payment_updated_at = now()
       where id = $1
       returning *`,
      [order.id]
    );

    return mismatchResult.rows[0] ?? {
      ...order,
      payment_status: "amount_mismatch",
      payment_error: "T-Bank amount mismatch",
    };
  }

  return order;
}

async function assertAuthSmsSendAllowed(phone) {
  const windowMinutes = getPositiveNumber(authSmsSendWindowMinutes, 15);
  const maxSends = getPositiveNumber(authSmsMaxSendsPerWindow, 5);
  const result = await query(
    `select count(*)::int as send_count
     from auth_sms_challenges
     where phone = $1
       and created_at > now() - ($2::int * interval '1 minute')`,
    [phone, windowMinutes]
  );
  const sendCount = Number(result.rows[0]?.send_count || 0);

  if (sendCount >= maxSends) {
    throw createHttpError(
      "Слишком много SMS-кодов. Попробуйте немного позже.",
      429
    );
  }
}

async function createAuthSmsChallenge({ ownerKey, phone, flowMode, passwordHash = null }) {
  const challengeId = crypto.randomUUID();
  const code = generateSmsCode();
  const expiresAt = getAuthSmsExpiresAt();
  const codeHash = hashSmsCode(challengeId, code);

  await assertAuthSmsSendAllowed(phone);

  await query(
    `update auth_sms_challenges
     set consumed_at = now()
     where owner_key = $1 and consumed_at is null`,
    [ownerKey]
  );

  await query(
    `insert into auth_sms_challenges (
       id, owner_key, phone, flow_mode, password_hash, code_hash, expires_at
     )
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [challengeId, ownerKey, phone, flowMode, passwordHash, codeHash, expiresAt]
  );

  let smsResult;

  try {
    smsResult = await sendAuthCodeSms(phone, code);
  } catch (error) {
    await query(
      "update auth_sms_challenges set consumed_at = now() where id = $1",
      [challengeId]
    );
    console.error("Auth SMS delivery failed", error);
    throw new Error("Не удалось отправить SMS. Попробуйте позже.");
  }

  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    mode: smsResult.mode,
    code: smsResult.code,
  };
}

function requireOwnerKey(req, res, next) {
  const ownerKey = getAuthOwnerKey(req);

  if (!ownerKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.ownerKey = ownerKey;
  next();
}

function requireAdminToken(req, res, next) {
  if (!adminToken) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const token = String(req.header("x-musorok-admin-token") || "").trim();

  if (!timingSafeTokenEqual(token, adminToken)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  next();
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

const rateLimitBuckets = new Map();

function getRequestIp(req) {
  return String(req.ip || req.headers["x-forwarded-for"] || "unknown")
    .split(",")[0]
    .trim();
}

function createRateLimit({ keyPrefix, windowMs, max, key }) {
  return (req, res, next) => {
    const now = Date.now();

    if (rateLimitBuckets.size > 5000) {
      for (const [bucketKey, bucket] of rateLimitBuckets.entries()) {
        if (bucket.resetAt <= now) {
          rateLimitBuckets.delete(bucketKey);
        }
      }
    }

    const bucketKey = `${keyPrefix}:${key(req)}`;
    const current = rateLimitBuckets.get(bucketKey);
    const bucket =
      current && current.resetAt > now
        ? current
        : {
            count: 0,
            resetAt: now + windowMs,
          };

    bucket.count += 1;
    rateLimitBuckets.set(bucketKey, bucket);

    if (bucket.count > max) {
      res.set("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({
        error: "Слишком много попыток. Попробуйте немного позже.",
      });
      return;
    }

    next();
  };
}

const authPasswordRateLimit = createRateLimit({
  keyPrefix: "auth-password",
  windowMs: 15 * 60 * 1000,
  max: 12,
  key: (req) => `${getRequestIp(req)}:${normalizePhone(req.body?.phone) || "unknown"}`,
});

const authSmsRateLimit = createRateLimit({
  keyPrefix: "auth-sms",
  windowMs: 10 * 60 * 1000,
  max: 3,
  key: (req) => `${getRequestIp(req)}:${String(req.body?.challengeId || "unknown")}`,
});

const authVerifyRateLimit = createRateLimit({
  keyPrefix: "auth-verify",
  windowMs: 10 * 60 * 1000,
  max: 8,
  key: (req) => `${getRequestIp(req)}:${String(req.body?.challengeId || "unknown")}`,
});

app.get("/health", asyncRoute(async (_req, res) => {
  const result = await query("select now() as now");
  res.json({ ok: true, dbTime: result.rows[0]?.now ?? null });
}));

app.post("/auth/register", authPasswordRateLimit, asyncRoute(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || "");
  const passwordError = validatePassword(password);

  if (!phone) {
    res.status(400).json({ error: "Введите корректный номер телефона." });
    return;
  }

  if (passwordError) {
    res.status(400).json({ error: passwordError });
    return;
  }

  const ownerKey = ownerKeyFromPhone(phone);
  const existing = await query(
    `select owner_key, password_hash
     from user_profiles
     where owner_key = $1 or phone = $2
     limit 1`,
    [ownerKey, phone]
  );

  if (existing.rows[0]?.password_hash) {
    res.status(409).json({
      error: "Аккаунт с этим номером уже зарегистрирован. Перейдите во вход.",
    });
    return;
  }

  const challenge = await createAuthSmsChallenge({
    ownerKey,
    phone,
    flowMode: "register",
    passwordHash: hashPassword(password),
  });

  res.status(201).json({
    ok: true,
    ...challenge,
  });
}));

app.post("/auth/login", authPasswordRateLimit, asyncRoute(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || "");

  if (!phone || !password) {
    res.status(400).json({ error: "Введите номер телефона и пароль." });
    return;
  }

  const result = await query(
    `select owner_key, first_name, last_name, phone, call_allowed, password_hash, updated_at
     from user_profiles
     where phone = $1 or owner_key = $2
     limit 1`,
    [phone, ownerKeyFromPhone(phone)]
  );
  const profile = result.rows[0];

  if (!profile?.password_hash) {
    res.status(404).json({
      error: "Аккаунт с этим номером не найден. Зарегистрируйтесь.",
    });
    return;
  }

  if (!verifyPassword(password, profile.password_hash)) {
    res.status(401).json({ error: "Неверный пароль." });
    return;
  }

  const challenge = await createAuthSmsChallenge({
    ownerKey: profile.owner_key,
    phone,
    flowMode: "login",
  });

  res.json({
    ok: true,
    ...challenge,
    profile: sanitizeProfile(profile),
  });
}));

app.post("/auth/request-code", (req, res) => {
  res.status(410).json({
    error: "Вход только по SMS-коду отключён. Введите телефон и пароль.",
  });
});

app.post("/auth/resend-code", authSmsRateLimit, asyncRoute(async (req, res) => {
  const challengeId =
    typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";

  if (!challengeId) {
    res.status(400).json({ error: "Запросите код заново." });
    return;
  }

  const result = await query(
    `select id, owner_key, phone, flow_mode, password_hash, attempts,
            expires_at, consumed_at
     from auth_sms_challenges
     where id = $1
     limit 1`,
    [challengeId]
  );
  const challenge = result.rows[0];

  if (!challenge || challenge.consumed_at) {
    res.status(401).json({ error: "Запросите код заново." });
    return;
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await query(
      "update auth_sms_challenges set consumed_at = now() where id = $1",
      [challengeId]
    );
    res.status(401).json({ error: "Код устарел. Введите пароль заново." });
    return;
  }

  const maxAttempts =
    Number.isFinite(authSmsMaxAttempts) && authSmsMaxAttempts > 0
      ? authSmsMaxAttempts
      : 5;

  if (challenge.attempts >= maxAttempts) {
    res.status(429).json({ error: "Слишком много попыток. Введите пароль заново." });
    return;
  }

  const nextChallenge = await createAuthSmsChallenge({
    ownerKey: challenge.owner_key,
    phone: challenge.phone,
    flowMode: challenge.flow_mode,
    passwordHash: challenge.password_hash,
  });

  res.json({
    ok: true,
    ...nextChallenge,
  });
}));

app.post("/auth/verify-code", authVerifyRateLimit, asyncRoute(async (req, res) => {
  const challengeId =
    typeof req.body?.challengeId === "string" ? req.body.challengeId.trim() : "";
  const code = String(req.body?.code || "").trim();

  if (!challengeId || !/^\d{4,6}$/.test(code)) {
    res.status(400).json({ error: "Введите код из SMS." });
    return;
  }

  const result = await query(
    `select id, owner_key, phone, flow_mode, password_hash, code_hash,
            expires_at, attempts, consumed_at
     from auth_sms_challenges
     where id = $1
     limit 1`,
    [challengeId]
  );
  const challenge = result.rows[0];

  if (!challenge || challenge.consumed_at) {
    res.status(401).json({ error: "Запросите новый код и попробуйте ещё раз." });
    return;
  }

  if (new Date(challenge.expires_at).getTime() < Date.now()) {
    await query(
      "update auth_sms_challenges set consumed_at = now() where id = $1",
      [challengeId]
    );
    res.status(401).json({ error: "Код устарел. Запросите новый код." });
    return;
  }

  const maxAttempts =
    Number.isFinite(authSmsMaxAttempts) && authSmsMaxAttempts > 0
      ? authSmsMaxAttempts
      : 5;

  if (challenge.attempts >= maxAttempts) {
    res.status(429).json({ error: "Слишком много попыток. Запросите новый код." });
    return;
  }

  const expectedHash = hashSmsCode(challengeId, code);

  if (!timingSafeStringEqual(expectedHash, challenge.code_hash)) {
    const nextAttempts = challenge.attempts + 1;

    await query(
      "update auth_sms_challenges set attempts = attempts + 1 where id = $1",
      [challengeId]
    );

    res.status(nextAttempts >= maxAttempts ? 429 : 401).json({
      error:
        nextAttempts >= maxAttempts
          ? "Слишком много попыток. Запросите новый код."
          : "Неверный код.",
    });
    return;
  }

  if (challenge.flow_mode === "register") {
    if (!challenge.password_hash) {
      res.status(401).json({ error: "Запросите регистрацию заново." });
      return;
    }

    await query(
      `insert into user_profiles (
         owner_key, phone, call_allowed, password_hash, password_updated_at, updated_at
       )
       values ($1, $2, true, $3, now(), now())
       on conflict (owner_key) do update
       set phone = excluded.phone,
           password_hash = excluded.password_hash,
           password_updated_at = now(),
           updated_at = now()`,
      [challenge.owner_key, challenge.phone, challenge.password_hash]
    );
  }

  const profileResult = await query(
    `select owner_key, first_name, last_name, phone, call_allowed, updated_at
     from user_profiles
     where owner_key = $1
     limit 1`,
    [challenge.owner_key]
  );
  const profile = profileResult.rows[0];

  if (!profile) {
    res.status(404).json({ error: "Профиль пользователя не найден." });
    return;
  }

  await query(
    "update auth_sms_challenges set consumed_at = now() where id = $1",
    [challengeId]
  );

  res.json({
    ok: true,
    token: buildAuthToken(profile.owner_key),
    ownerKey: profile.owner_key,
    profile: sanitizeProfile(profile),
  });
}));

app.get("/profile", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    `select owner_key, first_name, last_name, phone, call_allowed, updated_at
     from user_profiles
     where owner_key = $1
     limit 1`,
    [req.ownerKey]
  );

  res.json({ profile: result.rows[0] ?? null });
}));

app.put("/profile", requireOwnerKey, asyncRoute(async (req, res) => {
  const body = req.body || {};
  const requestedPhone =
    body.phone === null || body.phone === undefined || body.phone === ""
      ? null
      : normalizePhone(body.phone);

  if (body.phone && !requestedPhone) {
    res.status(400).json({ error: "Введите корректный номер телефона." });
    return;
  }

  const existingResult = await query(
    `select phone
     from user_profiles
     where owner_key = $1
     limit 1`,
    [req.ownerKey]
  );
  const existingPhone = normalizePhone(existingResult.rows[0]?.phone);

  if (
    requestedPhone &&
    existingPhone &&
    requestedPhone !== existingPhone
  ) {
    res.status(409).json({
      error: "Смена телефона требует подтверждения по SMS.",
    });
    return;
  }

  if (
    requestedPhone &&
    !existingPhone &&
    ownerKeyFromPhone(requestedPhone) !== req.ownerKey
  ) {
    res.status(409).json({
      error: "Смена телефона требует подтверждения по SMS.",
    });
    return;
  }

  const phone = existingPhone || requestedPhone;

  const result = await query(
    `insert into user_profiles (
       owner_key, first_name, last_name, phone, call_allowed, updated_at
     )
     values ($1, $2, $3, $4, $5, now())
     on conflict (owner_key) do update
     set first_name = excluded.first_name,
         last_name = excluded.last_name,
         phone = coalesce(excluded.phone, user_profiles.phone),
         call_allowed = excluded.call_allowed,
         updated_at = now()
     returning owner_key, first_name, last_name, phone, call_allowed, updated_at`,
    [
      req.ownerKey,
      String(body.first_name || "").trim() || null,
      String(body.last_name || "").trim() || null,
      phone,
      body.call_allowed !== false,
    ]
  );

  res.json({ profile: result.rows[0] });
}));

app.get("/addresses", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    `select *
     from user_addresses
     where owner_key = $1
     order by is_primary desc, created_at desc`,
    [req.ownerKey]
  );

  res.json({ addresses: result.rows });
}));

app.post("/addresses", requireOwnerKey, asyncRoute(async (req, res) => {
  const body = req.body || {};

  if (body.is_primary === true) {
    await query("update user_addresses set is_primary = false where owner_key = $1", [
      req.ownerKey,
    ]);
  }

  const result = await query(
    `insert into user_addresses (
       owner_key, label, street, apartment, entrance, floor, comment,
       is_primary, latitude, longitude
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     returning *`,
    [
      req.ownerKey,
      String(body.label || "Дом").trim(),
      String(body.street || "").trim(),
      body.apartment || null,
      body.entrance || null,
      body.floor || null,
      body.comment || null,
      body.is_primary === true,
      body.latitude ?? null,
      body.longitude ?? null,
    ]
  );

  res.status(201).json({ address: result.rows[0] });
}));

app.patch("/addresses/:id", requireOwnerKey, asyncRoute(async (req, res) => {
  const body = req.body || {};

  if (body.is_primary === true) {
    await query("update user_addresses set is_primary = false where owner_key = $1", [
      req.ownerKey,
    ]);
  }

  const result = await query(
    `update user_addresses
     set label = coalesce($3, label),
         street = coalesce($4, street),
         apartment = $5,
         entrance = $6,
         floor = $7,
         comment = $8,
         is_primary = coalesce($9, is_primary),
         latitude = $10,
         longitude = $11,
         updated_at = now()
     where id = $1 and owner_key = $2
     returning *`,
    [
      req.params.id,
      req.ownerKey,
      body.label ?? null,
      body.street ?? null,
      body.apartment ?? null,
      body.entrance ?? null,
      body.floor ?? null,
      body.comment ?? null,
      typeof body.is_primary === "boolean" ? body.is_primary : null,
      body.latitude ?? null,
      body.longitude ?? null,
    ]
  );

  if (!result.rows[0]) {
    res.status(404).json({ error: "Address not found." });
    return;
  }

  res.json({ address: result.rows[0] });
}));

app.delete("/addresses/:id", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    "delete from user_addresses where id = $1 and owner_key = $2 returning id",
    [req.params.id, req.ownerKey]
  );

  res.json({ ok: Boolean(result.rows[0]) });
}));

app.get("/orders/active", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    `select *
     from orders
     where owner_key = $1
       and status in ('new', 'assigned', 'on_the_way', 'arrived')
     order by created_at desc
     limit 1`,
    [req.ownerKey]
  );

  res.json({ order: result.rows[0] ?? null });
}));

app.get("/orders/history", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    `select *
     from orders
     where owner_key = $1
     order by created_at desc
     limit 50`,
    [req.ownerKey]
  );

  res.json({ orders: result.rows });
}));

app.patch("/admin/orders/:id/status", requireAdminToken, asyncRoute(async (req, res) => {
  const nextStatus = String(req.body?.status || "").trim();
  const orderResult = await query(
    `select *
     from orders
     where id = $1
     limit 1`,
    [req.params.id]
  );
  const order = orderResult.rows[0];

  if (!order) {
    res.status(404).json({ error: "Заказ не найден." });
    return;
  }

  assertOrderStatusTransition(order.status, nextStatus);

  if (order.status === nextStatus) {
    res.json({ order });
    return;
  }

  const updatedResult = await query(
    `update orders
     set status = $1,
         updated_at = now()
     where id = $2
     returning *`,
    [nextStatus, order.id]
  );
  const updatedOrder = updatedResult.rows[0];

  await notifyOrderStatusUpdate(updatedOrder);

  res.json({ order: updatedOrder });
}));

function normalizeOrderText(value, { label, maxLength, required = false }) {
  if (value === null || value === undefined) {
    if (required) {
      throw createHttpError(`${label} обязателен.`, 400);
    }

    return null;
  }

  const text = String(value).trim();

  if (!text) {
    if (required) {
      throw createHttpError(`${label} обязателен.`, 400);
    }

    return null;
  }

  if (text.length > maxLength) {
    throw createHttpError(`${label} слишком длинный.`, 400);
  }

  return text;
}

function normalizeOrderCoordinate(value, { label, min, max }) {
  const coordinate = Number(value);

  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    throw createHttpError(`${label} должен быть подтверждён на карте.`, 400);
  }

  return coordinate;
}

function normalizeOrderTip(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const tip = Number(value);
  const tipLimit = getPositiveNumber(maxOrderTip, 1000);

  if (!Number.isInteger(tip) || tip < 0 || tip > tipLimit) {
    throw createHttpError(`Чаевые должны быть от 0 до ${tipLimit} ₽.`, 400);
  }

  return tip;
}

function buildCreateOrderPayload(body, ownerKey) {
  const packageId = normalizeOrderText(body.package_id, {
    label: "Пакет",
    maxLength: 32,
    required: true,
  });
  const orderPackage = getOrderPackage(packageId);

  if (!orderPackage) {
    throw createHttpError("Выбранный пакет недоступен.", 400);
  }

  const phone = normalizePhone(body.phone);

  if (!phone) {
    throw createHttpError("Введите корректный номер телефона.", 400);
  }

  const tip = normalizeOrderTip(body.tip);
  const packagePrice = orderPackage.price;
  const shouldCall = body.should_call !== false;

  return {
    ownerKey,
    status: "new",
    address: normalizeOrderText(body.address, {
      label: "Адрес",
      maxLength: 180,
      required: true,
    }),
    packageId: orderPackage.id,
    packageLabel: getOrderPackageLabel(orderPackage),
    packagePrice,
    apartment: normalizeOrderText(body.apartment, {
      label: "Квартира",
      maxLength: 32,
    }),
    entrance: normalizeOrderText(body.entrance, {
      label: "Подъезд",
      maxLength: 32,
    }),
    floor: normalizeOrderText(body.floor, {
      label: "Этаж",
      maxLength: 32,
    }),
    intercom: normalizeOrderText(body.intercom, {
      label: "Домофон",
      maxLength: 64,
    }),
    addressLabel: normalizeOrderText(body.address_label, {
      label: "Название адреса",
      maxLength: 120,
    }),
    latitude: normalizeOrderCoordinate(body.latitude, {
      label: "Широта",
      min: -90,
      max: 90,
    }),
    longitude: normalizeOrderCoordinate(body.longitude, {
      label: "Долгота",
      min: -180,
      max: 180,
    }),
    comment: normalizeOrderText(body.comment, {
      label: "Комментарий",
      maxLength: 500,
    }),
    leaveAtDoor: body.leave_at_door === true,
    phone,
    shouldCall,
    paymentMethod: body.payment_method === "sbp" ? "sbp" : "card",
    tip,
    total: packagePrice + tip,
    courierId: null,
    callRequired: shouldCall,
  };
}

app.post("/orders", requireOwnerKey, asyncRoute(async (req, res) => {
  const order = buildCreateOrderPayload(req.body || {}, req.ownerKey);

  const result = await query(
    `insert into orders (
       owner_key, status, address, package_id, package_label, package_price,
       apartment, entrance, floor, intercom, address_label, latitude, longitude,
       comment, leave_at_door, phone, should_call, payment_method, tip, total,
       courier_id, call_required
     )
     values (
       $1, coalesce($2, 'new'), $3, $4, $5, $6,
       $7, $8, $9, $10, $11, $12, $13,
       $14, $15, $16, $17, $18, $19, $20,
       $21, $22
     )
     returning *`,
    [
      order.ownerKey,
      order.status,
      order.address,
      order.packageId,
      order.packageLabel,
      order.packagePrice,
      order.apartment,
      order.entrance,
      order.floor,
      order.intercom,
      order.addressLabel,
      order.latitude,
      order.longitude,
      order.comment,
      order.leaveAtDoor,
      order.phone,
      order.shouldCall,
      order.paymentMethod,
      order.tip,
      order.total,
      order.courierId,
      order.callRequired,
    ]
  );

  res.status(201).json({ order: result.rows[0] });
}));

app.post("/orders/:id/payment/init", requireOwnerKey, asyncRoute(async (req, res) => {
  const orderResult = await query(
    `select *
     from orders
     where id = $1 and owner_key = $2
     limit 1`,
    [req.params.id, req.ownerKey]
  );
  const order = orderResult.rows[0];

  if (!order) {
    res.status(404).json({ error: "Заказ не найден." });
    return;
  }

  if (Number(order.total) <= 0) {
    res.status(400).json({ error: "Сумма заказа должна быть больше нуля." });
    return;
  }

  if (order.payment_status === "confirmed") {
    res.json({
      payment: {
        orderId: order.id,
        paymentId: order.payment_id,
        paymentUrl: order.payment_url,
        status: order.payment_status,
      },
    });
    return;
  }

  if (
    ["pending", "authorized"].includes(order.payment_status) &&
    order.payment_id &&
    order.payment_url
  ) {
    res.json({
      payment: {
        orderId: order.id,
        paymentId: order.payment_id,
        paymentUrl: order.payment_url,
        status: order.payment_status,
      },
    });
    return;
  }

  const payment = await initPayment(order);
  const updatedOrder = await updateOrderPaymentState({
    orderId: order.id,
    ownerKey: req.ownerKey,
    paymentId: payment.paymentId,
    paymentUrl: payment.paymentUrl,
    status: payment.status,
    amount: payment.amount,
  });

  res.json({
    payment: {
      orderId: updatedOrder.id,
      paymentId: payment.paymentId,
      paymentUrl: payment.paymentUrl,
      status: updatedOrder.payment_status,
      providerStatus: payment.status,
    },
  });
}));

app.get("/orders/:id/payment", requireOwnerKey, asyncRoute(async (req, res) => {
  const orderResult = await query(
    `select *
     from orders
     where id = $1 and owner_key = $2
     limit 1`,
    [req.params.id, req.ownerKey]
  );
  const order = orderResult.rows[0];

  if (!order) {
    res.status(404).json({ error: "Заказ не найден." });
    return;
  }

  if (!order.payment_id) {
    res.json({
      payment: {
        orderId: order.id,
        paymentId: null,
        paymentUrl: null,
        status: order.payment_status || "not_started",
        providerStatus: null,
      },
    });
    return;
  }

  const state = await getPaymentState(order.payment_id);
  const updatedOrder = await updateOrderPaymentState({
    orderId: order.id,
    ownerKey: req.ownerKey,
    paymentId: order.payment_id,
    paymentUrl: order.payment_url,
    status: state.Status,
    amount: state.Amount,
    error: state.Message || state.Details || null,
  });

  res.json({
    payment: {
      orderId: updatedOrder.id,
      paymentId: updatedOrder.payment_id,
      paymentUrl: updatedOrder.payment_url,
      status: updatedOrder.payment_status,
      providerStatus: state.Status,
    },
  });
}));

app.post("/payments/tbank/notification", asyncRoute(async (req, res) => {
  const body = req.body || {};

  if (!verifyNotification(body)) {
    res.status(403).send("INVALID TOKEN");
    return;
  }

  const orderId = typeof body.OrderId === "string" ? body.OrderId : "";

  if (!orderId) {
    res.status(400).send("MISSING ORDER");
    return;
  }

  await updateOrderPaymentState({
    orderId,
    paymentId: body.PaymentId ? String(body.PaymentId) : null,
    status: body.Status,
    amount: body.Amount,
    error: body.Message || body.Details || null,
  });

  res.status(200).send("OK");
}));

app.get("/payment-preferences", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    "select * from user_payment_preferences where owner_key = $1 limit 1",
    [req.ownerKey]
  );

  res.json({ preferences: result.rows[0] ?? null });
}));

app.put("/payment-preferences", requireOwnerKey, asyncRoute(async (req, res) => {
  const body = req.body || {};
  const result = await query(
    `insert into user_payment_preferences (
       owner_key, default_method, allow_cash, allow_card, default_tip,
       ask_before_changing_method, updated_at
     )
     values ($1, $2, false, true, $3, $4, now())
     on conflict (owner_key) do update
     set default_method = excluded.default_method,
         allow_cash = false,
         allow_card = true,
         default_tip = excluded.default_tip,
         ask_before_changing_method = excluded.ask_before_changing_method,
         updated_at = now()
     returning *`,
    [
      req.ownerKey,
      body.default_method === "sbp" ? "sbp" : "card",
      Number.isFinite(Number(body.default_tip)) ? Math.max(0, Number(body.default_tip)) : 0,
      body.ask_before_changing_method === true,
    ]
  );

  res.json({ preferences: result.rows[0] });
}));

app.post("/push-tokens", requireOwnerKey, asyncRoute(async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const platform =
    req.body?.platform === "ios" || req.body?.platform === "android"
      ? req.body.platform
      : "unknown";
  const deviceId =
    typeof req.body?.device_id === "string"
      ? req.body.device_id.trim().slice(0, 120)
      : null;

  if (!isExpoPushToken(token)) {
    res.status(400).json({ error: "Некорректный push-токен." });
    return;
  }

  await query(
    `insert into user_push_tokens (
       token, owner_key, platform, device_id, updated_at
     )
     values ($1, $2, $3, $4, now())
     on conflict (token) do update
     set owner_key = excluded.owner_key,
         platform = excluded.platform,
         device_id = excluded.device_id,
         updated_at = now()`,
    [token, req.ownerKey, platform, deviceId]
  );

  res.json({ ok: true });
}));

app.delete("/push-tokens", requireOwnerKey, asyncRoute(async (req, res) => {
  const token = String(req.body?.token || "").trim();

  if (!token) {
    res.status(400).json({ error: "Не найден push-токен." });
    return;
  }

  await query(
    `delete from user_push_tokens
     where owner_key = $1 and token = $2`,
    [req.ownerKey, token]
  );

  res.json({ ok: true });
}));

app.get("/notification-preferences", requireOwnerKey, asyncRoute(async (req, res) => {
  const result = await query(
    "select * from user_notification_preferences where owner_key = $1 limit 1",
    [req.ownerKey]
  );

  res.json({ preferences: result.rows[0] ?? null });
}));

app.put("/notification-preferences", requireOwnerKey, asyncRoute(async (req, res) => {
  const body = req.body || {};
  const result = await query(
    `insert into user_notification_preferences (
       owner_key, order_updates_enabled, promotions_enabled, reminders_enabled,
       system_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
       updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (owner_key) do update
     set order_updates_enabled = excluded.order_updates_enabled,
         promotions_enabled = excluded.promotions_enabled,
         reminders_enabled = excluded.reminders_enabled,
         system_enabled = excluded.system_enabled,
         quiet_hours_enabled = excluded.quiet_hours_enabled,
         quiet_hours_start = excluded.quiet_hours_start,
         quiet_hours_end = excluded.quiet_hours_end,
         updated_at = now()
     returning *`,
    [
      req.ownerKey,
      body.order_updates_enabled !== false,
      body.promotions_enabled === true,
      body.reminders_enabled !== false,
      body.system_enabled !== false,
      body.quiet_hours_enabled === true,
      body.quiet_hours_start || "22:00",
      body.quiet_hours_end || "09:00",
    ]
  );

  res.json({ preferences: result.rows[0] });
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  const statusCode =
    Number.isInteger(error?.statusCode) && error.statusCode >= 400
      ? error.statusCode
      : 500;
  const message =
    statusCode >= 500 && isProduction
      ? "Internal server error"
      : error instanceof Error
        ? error.message
        : "Internal server error";

  res.status(statusCode).json({ error: message });
});

app.listen(port, () => {
  console.log(`MusorOK API is listening on http://localhost:${port}`);
});
