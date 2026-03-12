export const prices = [
  {
    id: "1",
    name: "1 пакет",
    price: 149,
    label: "1 пакет — 149 ₽",
    desc: "1 пакет"
  },
  {
    id: "2-3",
    name: "2–3 пакета",
    price: 199,
    label: "2–3 пакета — 199 ₽",
    desc: "2–3 пакета"
  },
  {
    id: "4-5",
    name: "4–5 пакетов",
    price: 249,
    label: "4–5 пакетов — 249 ₽",
    desc: "4–5 пакетов"
  },
  {
    id: "6+",
    name: "6+ пакетов",
    price: 299,
    label: "6+ пакетов — 299 ₽",
    desc: "6+ пакетов"
  }
] as const;

export const DEFAULT_ADDRESS_LABEL = "Выберите адрес";