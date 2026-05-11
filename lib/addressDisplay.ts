const LOCATION_PARTS_TO_HIDE = [
  "Краснодар",
  "Краснодарский край",
  "город Краснодар",
  "г. Краснодар",
  "Россия",
];

const LOCATION_PART_PATTERNS_TO_HIDE = [
  /^край\b/i,
  /^область\b/i,
  /^город\b/i,
  /^г\.\s*/i,
  /^микрорайон\b/i,
  /^мкр\.?\b/i,
  /^район\b/i,
  /^жилой район\b/i,
  /^муниципальное образование\b/i,
  /\bгородской округ\b/i,
  /\bвнутригородской округ\b/i,
  /\bрайон\b/i,
  /\bкрай\b/i,
  /^\d{5,6}$/,
];

const STREET_TYPE_PATTERNS = [
  "ул\\.?",
  "улица",
  "проспект",
  "пр-?т\\.?",
  "переулок",
  "пер\\.?",
  "бульвар",
  "бул\\.?",
  "площадь",
  "пл\\.?",
  "шоссе",
  "проезд",
  "набережная",
  "наб\\.?",
  "аллея",
  "тупик",
  "тракт",
];

const STREET_TYPE_PREFIX_RE = new RegExp(
  `^(?:${STREET_TYPE_PATTERNS.join("|")})\\s+`,
  "i"
);

const STREET_TYPE_SUFFIX_RE = new RegExp(
  `\\s+(?:${STREET_TYPE_PATTERNS.join("|")})$`,
  "i"
);

const HOUSE_TOKEN_RE =
  /^(?:д(?:ом)?\.?\s*)?\d[\dA-Za-zА-Яа-я]*(?:[/-]\d[\dA-Za-zА-Яа-я]*)?(?:\s*(?:к|корпус|корп\.?|стр\.?|строение|литера|лит\.?)\s*\d[\dA-Za-zА-Яа-я]*)?$/i;

const INLINE_STREET_HOUSE_RE =
  /^(.+?)\s+(?:д(?:ом)?\.?\s*)?(\d[\dA-Za-zА-Яа-я]*(?:[/-]\d[\dA-Za-zА-Яа-я]*)?(?:\s*(?:к|корпус|корп\.?|стр\.?|строение|литера|лит\.?)\s*\d[\dA-Za-zА-Яа-я]*)?)$/i;

function normalizeSpacing(value: string) {
  return value
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .trim();
}

function shouldHideLocationPart(part: string) {
  const normalized = part.toLowerCase();
  const looksLikeNamedMicrodistrict =
    /^(?:микрорайон|мкр\.?|жилой район)\s+(?:им(?:ени|\.)?\s+)?\S+/i.test(part);

  if (
    LOCATION_PARTS_TO_HIDE.some(
      (hiddenPart) => normalized === hiddenPart.toLowerCase()
    )
  ) {
    return true;
  }

  if (/^координаты/i.test(part)) {
    return true;
  }

  if (/^-?\d+(?:[.,]\d+)?\s*[, ]\s*-?\d+(?:[.,]\d+)?$/.test(part)) {
    return true;
  }

  if (/^-?\d+[.,]\d+$/.test(part)) {
    return true;
  }

  if (looksLikeNamedMicrodistrict) {
    return false;
  }

  return LOCATION_PART_PATTERNS_TO_HIDE.some((pattern) => pattern.test(part));
}

function normalizeStreetPart(value: string) {
  return normalizeSpacing(value)
    .replace(/^(?:микрорайон|мкр\.?|жилой район)\s+/i, "")
    .replace(STREET_TYPE_PREFIX_RE, "")
    .replace(STREET_TYPE_SUFFIX_RE, "")
    .replace(/^им(?:ени|\.)?\s+/i, "")
    .trim();
}

function normalizeHousePart(value: string) {
  return normalizeSpacing(value)
    .replace(/^д(?:ом)?\.?\s*/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isHousePart(value: string) {
  return HOUSE_TOKEN_RE.test(value);
}

function formatStreetHouse(street: string, house?: string | null) {
  const normalizedStreet = normalizeStreetPart(street);
  const normalizedHouse = house ? normalizeHousePart(house) : "";

  if (normalizedStreet && normalizedHouse) {
    return `${normalizedStreet}, ${normalizedHouse}`;
  }

  return normalizedStreet || normalizedHouse;
}

function splitInlineStreetHouse(value: string) {
  const normalized = normalizeStreetPart(value);
  const match = normalized.match(INLINE_STREET_HOUSE_RE);

  if (!match) {
    return null;
  }

  return formatStreetHouse(match[1], match[2]);
}

export function cleanAddressForDisplay(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parts = normalizeSpacing(value)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !shouldHideLocationPart(part));

  for (let index = 0; index < parts.length; index += 1) {
    const street = normalizeStreetPart(parts[index]);
    const nextPart = parts[index + 1] ? normalizeHousePart(parts[index + 1]) : "";

    if (street && nextPart && isHousePart(nextPart)) {
      return formatStreetHouse(street, nextPart);
    }

    const inlineStreetHouse = splitInlineStreetHouse(parts[index]);

    if (inlineStreetHouse) {
      return inlineStreetHouse;
    }
  }

  return parts
    .map((part) => normalizeStreetPart(part))
    .filter(Boolean)
    .slice(0, 2)
    .join(", ");
}

export function buildStreetHouseAddress(
  street?: string | null,
  house?: string | null
) {
  return formatStreetHouse(street ?? "", house ?? "");
}
