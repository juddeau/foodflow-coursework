export interface PricedLine {
  price: number;
  quantity: number;
}

export const DELIVERY_FEE = 149;
export const FREE_DELIVERY_FROM = 1500;
export const MAX_QUANTITY = 20;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateTotals(lines: PricedLine[]) {
  if (lines.length === 0) throw new Error('Заказ не может быть пустым');
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > MAX_QUANTITY) {
      throw new Error(`Количество должно быть от 1 до ${MAX_QUANTITY}`);
    }
  }
  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  const deliveryFee = subtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  return { subtotal, deliveryFee, total: round2(subtotal + deliveryFee) };
}
