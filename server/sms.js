const { PublishCommand, SNSClient } = require("@aws-sdk/client-sns");

const yandexCnsEndpoint =
  process.env.YANDEX_CNS_ENDPOINT || "https://notifications.yandexcloud.net";
const yandexCnsRegion = process.env.YANDEX_CNS_REGION || "ru-central1";
const yandexCnsAccessKeyId = process.env.YANDEX_CNS_ACCESS_KEY_ID;
const yandexCnsSecretAccessKey = process.env.YANDEX_CNS_SECRET_ACCESS_KEY;
const yandexSmsSenderId = process.env.YANDEX_CNS_SMS_SENDER_ID;
const authSmsDebugCodeEnabled = process.env.AUTH_SMS_DEBUG_CODE_ENABLED === "true";
const authSmsClientDebugCodeEnabled =
  process.env.AUTH_SMS_CLIENT_DEBUG_CODE_ENABLED === "true";
const smsTimeoutMs = Number(process.env.YANDEX_CNS_SMS_TIMEOUT_MS || 10000);

let snsClient;

function maskPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");

  if (digits.length < 4) {
    return "+7***";
  }

  return `+7***${digits.slice(-4)}`;
}

function isYandexSmsConfigured() {
  return Boolean(yandexCnsAccessKeyId && yandexCnsSecretAccessKey);
}

function getSnsClient() {
  if (!isYandexSmsConfigured()) {
    return null;
  }

  if (!snsClient) {
    snsClient = new SNSClient({
      endpoint: yandexCnsEndpoint,
      region: yandexCnsRegion,
      credentials: {
        accessKeyId: yandexCnsAccessKeyId,
        secretAccessKey: yandexCnsSecretAccessKey,
      },
    });
  }

  return snsClient;
}

async function sendSms(phone, message) {
  if (authSmsDebugCodeEnabled) {
    console.log(`[auth-sms:debug] local auth code generated for ${maskPhone(phone)}`);
    return { mode: "local" };
  }

  const client = getSnsClient();

  if (!client) {
    throw new Error("SMS provider is not configured.");
  }

  const messageAttributes = {
    "AWS.SNS.SMS.SMSType": {
      DataType: "String",
      StringValue: "Transactional",
    },
  };

  if (yandexSmsSenderId) {
    messageAttributes["AWS.SNS.SMS.SenderID"] = {
      DataType: "String",
      StringValue: yandexSmsSenderId,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), smsTimeoutMs);

  try {
    await client.send(new PublishCommand({
      PhoneNumber: phone,
      Message: message,
      MessageAttributes: messageAttributes,
    }), {
      abortSignal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("SMS provider request timed out.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  return { mode: "sms" };
}

async function sendAuthCodeSms(phone, code) {
  const result = await sendSms(
    phone,
    `Код MusorOK: ${code}. Никому не сообщайте этот код.`
  );

  return {
    ...result,
    code:
      authSmsClientDebugCodeEnabled ||
      (authSmsDebugCodeEnabled && result.mode === "local")
        ? code
        : undefined,
  };
}

module.exports = {
  isYandexSmsConfigured,
  sendAuthCodeSms,
};
