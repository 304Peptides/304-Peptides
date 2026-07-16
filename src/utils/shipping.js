export const FREE_SHIPPING_THRESHOLD = 100;
export const FLAT_SHIPPING_FEE = 15;

export function calculateShippingFee(subtotal) {
  const amount = Number(subtotal || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    return 0;
  }

  return amount >= FREE_SHIPPING_THRESHOLD
    ? 0
    : FLAT_SHIPPING_FEE;
}

export function calculateOrderTotal(subtotal) {
  const amount = Number(subtotal || 0);
  const safeSubtotal = Number.isFinite(amount)
    ? Math.max(0, amount)
    : 0;

  return safeSubtotal + calculateShippingFee(safeSubtotal);
}

export function getFreeShippingRemaining(subtotal) {
  const amount = Number(subtotal || 0);
  const safeSubtotal = Number.isFinite(amount)
    ? Math.max(0, amount)
    : 0;

  return Math.max(0, FREE_SHIPPING_THRESHOLD - safeSubtotal);
}
