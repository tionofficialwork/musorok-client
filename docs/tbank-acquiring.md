# T-Bank интернет-эквайринг

## Выбранный сценарий

Для мобильного приложения используем готовую платежную форму Т-Банка:

1. Клиент создаёт заказ в MusorOK.
2. Наш API вызывает `/v2/Init` на сервере Т-Банка.
3. Приложение открывает `PaymentURL` через системный браузер.
4. После возврата в приложение MusorOK вызывает наш API для проверки статуса.
5. Т-Банк дополнительно присылает HTTP-уведомление на webhook.

Ключи терминала хранятся только в Serverless Container.

## Переменные окружения API

```env
TBANK_ACQUIRING_API_URL=https://rest-api-test.tinkoff.ru/v2
TBANK_ACQUIRING_TERMINAL_KEY=<TerminalKey>
TBANK_ACQUIRING_PASSWORD=<пароль терминала>
TBANK_ACQUIRING_PAY_TYPE=O
TBANK_ACQUIRING_TIMEOUT_MS=15000
TBANK_ACQUIRING_NOTIFICATION_URL=https://<api-host>/payments/tbank/notification
TBANK_ACQUIRING_SUCCESS_URL=musorok://order/payment-return?result=success
TBANK_ACQUIRING_FAIL_URL=musorok://order/payment-return?result=fail
```

Для боевой среды `TBANK_ACQUIRING_API_URL`:

```env
https://securepay.tinkoff.ru/v2
```

## Что нужно сделать в Т-Банке

1. В личном кабинете интернет-эквайринга открой магазины и терминалы.
2. Настрой тип подключения терминала `Универсальное`.
3. Включи нужные способы оплаты в готовой платежной форме.
4. Возьми `TerminalKey` и пароль терминала для API.
5. Для тестовой среды попроси поддержку добавить IP контейнера/локальный IP в whitelist тестовой среды. Если `/v2/Init` отвечает HTML-страницей `403 Forbidden`, whitelist ещё не применён или указан не тот IP.
   Поддержка Т-Банка сообщила, что добавление IP вступит в силу 11.05.2026 18:00 по московскому времени.
6. Укажи webhook:

```text
https://bbamd3h76o8pmr45eg25.containers.yandexcloud.net/payments/tbank/notification
```

## Проверка

1. Применить миграцию `docs/tbank-payments-migration.sql`.
2. Задеплоить новую ревизию контейнера с env.
3. В приложении создать заказ и выбрать оплату картой или СБП.
4. После формы оплаты статус заказа должен стать `authorized` или `confirmed`.

Т-Банк рекомендует после возврата из платежной формы всегда проверять статус и
сумму через API, а не доверять только deeplink-возврату.
