// ════════════════════════════════════════════
//  Utils Barrel
//  File: packages/shared/src/utils/index.ts
// ════════════════════════════════════════════

/**
 * Format paise value into a human readable rupee string.
 * E.g., 25000 paise -> "₹250.00"
 */
export function formatPaiseToRupees(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

/**
 * Calculates GST breakdown for a line item price (exclusive or inclusive of tax).
 */
export function calculateGST(
  priceInPaise: number,
  quantity: number,
  ratePercentage: number,
  isInclusive: boolean
): { base: number; tax: number } {
  const totalRaw = priceInPaise * quantity;
  if (isInclusive) {
    // base = totalRaw / (1 + (ratePercentage / 100))
    const base = Math.round(totalRaw / (1 + ratePercentage / 100));
    const tax = totalRaw - base;
    return { base, tax };
  } else {
    const tax = Math.round(totalRaw * (ratePercentage / 100));
    return { base: totalRaw, tax };
  }
}
