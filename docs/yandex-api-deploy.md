# Публичный API MusorOK в Yandex Serverless Containers

## Что получится

Схема после деплоя:

```text
iOS / Android -> Yandex Serverless Container -> Yandex Managed PostgreSQL
```

В мобильной сборке будет только публичный URL API. Пароль от базы остается в Yandex Cloud и не попадает в приложение.

## Подготовка проекта

API собирается из `Dockerfile.api`.

Контейнер обязан слушать порт из переменной `PORT`; это уже учтено в `server/index.js`.

## 1. Создать Container Registry

В Yandex Cloud:

1. Открой `Container Registry`.
2. Нажми `Создать реестр`.
3. Имя: `musorok-api`.
4. Скопируй `ID реестра`, он выглядит примерно так:

```text
crp...
```

## 2. Собрать и отправить Docker image

В терминале из корня проекта:

```bash
yc container registry configure-docker
```

```bash
docker build -f Dockerfile.api -t cr.yandex/<REGISTRY_ID>/musorok-api:0.0.1 .
```

```bash
docker push cr.yandex/<REGISTRY_ID>/musorok-api:0.0.1
```

## 3. Создать Serverless Container

В Yandex Cloud:

1. Открой `Serverless Containers`.
2. Нажми `Создать контейнер`.
3. Имя: `musorok-api`.
4. Создай ревизию из image:

```text
cr.yandex/<REGISTRY_ID>/musorok-api:0.0.1
```

5. Включи публичный доступ / неавторизованный вызов, чтобы мобильное приложение могло обращаться к API.

## 4. Переменные окружения контейнера

Добавь переменные:

```env
YANDEX_POSTGRES_HOST=rc1b-b6s6g06sen2ns5f1.mdb.yandexcloud.net
YANDEX_POSTGRES_PORT=6432
YANDEX_POSTGRES_DB=musorok
YANDEX_POSTGRES_USER=musorok_app
YANDEX_POSTGRES_PASSWORD=<пароль пользователя musorok_app>
YANDEX_POSTGRES_SSL_REJECT_UNAUTHORIZED=true
YANDEX_POSTGRES_CA_CERT=<CA сертификат Yandex Managed PostgreSQL, если нужен>
YANDEX_POSTGRES_CONNECTION_TIMEOUT_MS=5000
YANDEX_POSTGRES_STATEMENT_TIMEOUT_MS=15000
YANDEX_POSTGRES_QUERY_TIMEOUT_MS=20000
API_ENV=production
API_ALLOWED_ORIGINS=
API_AUTH_SECRET=<длинная случайная строка для подписи токенов>
API_ADMIN_TOKEN=<длинная случайная строка для админских операций статуса>
AUTH_SMS_CODE_TTL_MINUTES=10
AUTH_SMS_MAX_ATTEMPTS=5
AUTH_SMS_MAX_SENDS_PER_WINDOW=5
AUTH_SMS_SEND_WINDOW_MINUTES=15
AUTH_TOKEN_TTL_DAYS=180
AUTH_SMS_DEBUG_CODE_ENABLED=false
EXPO_PUSH_TIMEOUT_MS=10000
YANDEX_CNS_ENDPOINT=https://notifications.yandexcloud.net
YANDEX_CNS_REGION=ru-central1
YANDEX_CNS_ACCESS_KEY_ID=<ID статического ключа сервисного аккаунта>
YANDEX_CNS_SECRET_ACCESS_KEY=<секрет статического ключа>
YANDEX_CNS_SMS_SENDER_ID=<имя отправителя, если оно зарегистрировано>
YANDEX_CNS_SMS_TIMEOUT_MS=10000
```

`PORT` задавать не нужно: Serverless Containers передаст его сам.

Для локальной разработки без реального SMS можно временно поставить
`AUTH_SMS_DEBUG_CODE_ENABLED=true`. Тогда API вернёт код в ответе и покажет его
на экране подтверждения. В публичной ревизии контейнера это должно быть `false`.

Перед релизом обязательно смени пароль PostgreSQL, который был засвечен во время
настройки, и обнови `YANDEX_POSTGRES_PASSWORD` в ревизии контейнера.

## 4.1. SMS через Yandex Cloud Notification Service

1. Запроси доступ к Cloud Notification Service, если сервис ещё не включён в
   облаке.
2. Создай SMS notification channel с common sender для тестов.
3. В sandbox добавь тестовый номер телефона и подтверди его кодом из SMS.
4. Создай сервисный аккаунт, дай ему роль `editor` на folder и выпусти для него
   static access key.
5. Положи `key_id` и `secret` в переменные `YANDEX_CNS_ACCESS_KEY_ID` и
   `YANDEX_CNS_SECRET_ACCESS_KEY` ревизии контейнера.
6. Перед релизом выйди из sandbox и настрой индивидуального отправителя, иначе
   SMS будут уходить только на тестовые номера.

## 4.2. Push-уведомления статусов заказа

1. Применить миграцию:

```bash
psql "$DATABASE_URL" -f docs/push-notifications-migration.sql
```

2. Приложение отправит Expo push token на `/push-tokens` после разрешения
   уведомлений.
3. Для ручной проверки статуса можно вызвать защищённый админ-эндпоинт:

```bash
curl -X PATCH "https://<id>.containers.yandexcloud.net/admin/orders/<order-id>/status" \
  -H "Content-Type: application/json" \
  -H "X-Musorok-Admin-Token: <API_ADMIN_TOKEN>" \
  -d '{"status":"assigned"}'
```

Разрешённые переходы: `new -> assigned -> on_the_way -> arrived -> done`, из
активных статусов также можно перейти в `cancelled`.

## 5. Проверить публичный API

После создания ревизии Яндекс даст URL вида:

```text
https://<id>.containers.yandexcloud.net
```

Проверь:

```bash
curl https://<id>.containers.yandexcloud.net/health
```

Ожидаемый ответ:

```json
{"ok":true}
```

## 6. Переключить приложение

В `.env` перед Android/iOS сборкой:

```env
EXPO_PUBLIC_API_URL=https://<id>.containers.yandexcloud.net
```

После смены переменной нужно пересобрать приложение.
