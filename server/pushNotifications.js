const expoPushApiUrl = "https://exp.host/--/api/v2/push/send";
const pushTimeoutMs = Number(process.env.EXPO_PUSH_TIMEOUT_MS || 10000);

function isExpoPushToken(token) {
  return /^Expo(nent)?PushToken\[[^\]]+\]$/.test(String(token || ""));
}

function chunk(values, size) {
  const chunks = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

async function sendExpoPushMessages(messages) {
  const validMessages = messages.filter((message) => isExpoPushToken(message.to));

  if (validMessages.length === 0) {
    return [];
  }

  const results = [];

  for (const batch of chunk(validMessages, 100)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), pushTimeoutMs);

    try {
      const response = await fetch(expoPushApiUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
        signal: controller.signal,
      });
      const text = await response.text();
      const payload = text ? JSON.parse(text) : null;

      if (!response.ok) {
        throw new Error(`Expo push request failed: HTTP ${response.status}`);
      }

      results.push(payload);
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error("Expo push request timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  return results;
}

module.exports = {
  isExpoPushToken,
  sendExpoPushMessages,
};
