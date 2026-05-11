const { Pool } = require("pg");

const requiredEnv = [
  "YANDEX_POSTGRES_HOST",
  "YANDEX_POSTGRES_PORT",
  "YANDEX_POSTGRES_DB",
  "YANDEX_POSTGRES_USER",
  "YANDEX_POSTGRES_PASSWORD",
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing`);
  }
}

const postgresCaCert = process.env.YANDEX_POSTGRES_CA_CERT
  ? process.env.YANDEX_POSTGRES_CA_CERT.replace(/\\n/g, "\n")
  : undefined;
const rejectUnauthorized =
  process.env.YANDEX_POSTGRES_SSL_REJECT_UNAUTHORIZED !== "false";
const connectionTimeoutMillis = Number(
  process.env.YANDEX_POSTGRES_CONNECTION_TIMEOUT_MS || 5000
);
const statementTimeoutMs = Number(
  process.env.YANDEX_POSTGRES_STATEMENT_TIMEOUT_MS || 15000
);
const queryTimeoutMs = Number(process.env.YANDEX_POSTGRES_QUERY_TIMEOUT_MS || 20000);

const pool = new Pool({
  host: process.env.YANDEX_POSTGRES_HOST,
  port: Number(process.env.YANDEX_POSTGRES_PORT),
  database: process.env.YANDEX_POSTGRES_DB,
  user: process.env.YANDEX_POSTGRES_USER,
  password: process.env.YANDEX_POSTGRES_PASSWORD,
  ssl: {
    rejectUnauthorized,
    ca: postgresCaCert,
  },
  max: 10,
  connectionTimeoutMillis,
  idleTimeoutMillis: 30_000,
  statement_timeout: statementTimeoutMs,
  query_timeout: queryTimeoutMs,
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};
