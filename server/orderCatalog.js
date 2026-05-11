const ORDER_PACKAGES = Object.freeze([
  Object.freeze({
    id: "s",
    size: "S",
    name: "Маленький пакет",
    price: 139,
  }),
  Object.freeze({
    id: "m",
    size: "M",
    name: "Средний пакет",
    price: 189,
  }),
  Object.freeze({
    id: "l",
    size: "L",
    name: "Большой пакет",
    price: 249,
  }),
]);

function getOrderPackage(packageId) {
  return ORDER_PACKAGES.find((item) => item.id === packageId) ?? null;
}

function getOrderPackageLabel(orderPackage) {
  return `${orderPackage.size} · ${orderPackage.name}`;
}

module.exports = {
  ORDER_PACKAGES,
  getOrderPackage,
  getOrderPackageLabel,
};
