# Перенос базы с Supabase на Yandex Cloud PostgreSQL

## Что выбираем в Яндексе

Нужен сервис `Managed Service for PostgreSQL`.

Мобильное приложение не должно подключаться к PostgreSQL напрямую. Логин, пароль и host базы нельзя хранить в приложении, потому что их можно достать из сборки. Правильная схема:

1. Приложение MusorOK.
2. Наш API-сервер.
3. Yandex Managed PostgreSQL.

## Что создать в Yandex Cloud

1. Создай кластер `Managed Service for PostgreSQL`.
2. Версия PostgreSQL: 16 или 17.
3. Создай базу, например `musorok`.
4. Создай пользователя, например `musorok_app`.
5. Сохрани:
   - host;
   - port, обычно `6432` или `5432`;
   - database;
   - user;
   - password;
   - SSL/CA certificate, если Яндекс попросит подключаться с сертификатом.

## Что выполнить в базе

В SQL-консоли или через `psql` выполни файл:

```bash
psql "postgresql://USER:PASSWORD@HOST:PORT/musorok?sslmode=require" \
  -f docs/yandex-postgres-schema.sql
```

Если запускаешь из корня проекта, путь уже правильный.

## Таблицы, которые сейчас нужны приложению

- `user_profiles` — профиль пользователя.
- `user_addresses` — сохраненные адреса.
- `orders` — заказы.
- `user_payment_preferences` — сохраненные способы оплаты и чаевые.
- `user_notification_preferences` — настройки уведомлений.

## Следующий технический шаг

После создания базы нужен API-слой. Он заменит Supabase-клиент в приложении.

Минимальный набор API:

- `POST /auth/request-code`
- `POST /auth/verify-code`
- `GET /profile`
- `PUT /profile`
- `GET /addresses`
- `POST /addresses`
- `PATCH /addresses/:id`
- `DELETE /addresses/:id`
- `GET /orders/active`
- `GET /orders/history`
- `POST /orders`
- `GET /payment-preferences`
- `PUT /payment-preferences`
- `GET /notification-preferences`
- `PUT /notification-preferences`

Временный код авторизации можно оставить как сейчас: API будет генерировать код, сохранять/проверять его и возвращать приложению тестовый код, пока не подключим SMS-провайдера.
