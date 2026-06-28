/**
 * Billing / tax core of invoice-service.
 *
 * Money is represented in integer cents to avoid floating-point drift.
 * VAT is the German standard rate (19%). This module is high risk: rate and
 * calculation changes are billing decisions and must go through a human gate
 * even when a fix looks trivial. See CODEOWNERS — owned by @billing.
 */

/** German standard VAT rate. Changing this is a billing decision, not a code fix. */
export const VAT_RATE = 0.2;

export interface LineItem {
  description: string;
  /** Number of units. Must be a positive integer. */
  quantity: number;
  /** Price per unit, in integer cents. Must be >= 0. */
  unitPriceCents: number;
}

export interface Invoice {
  id: string;
  customer: string;
  lineItems: LineItem[];
}

export interface InvoiceTotals {
  subtotalCents: number;
  vatRate: number;
  vatCents: number;
  totalCents: number;
}

/** Sum of quantity * unit price across all line items, in cents. */
export function subtotal(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new Error(`Invalid quantity for "${item.description}": ${item.quantity}`);
    }
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new Error(`Invalid unitPriceCents for "${item.description}": ${item.unitPriceCents}`);
    }
    return sum + item.quantity * item.unitPriceCents;
  }, 0);
}

/** VAT amount in cents, rounded to the nearest cent (half-up). */
export function vatFor(subtotalCents: number): number {
  return Math.round(subtotalCents * VAT_RATE);
}

/** Full breakdown: subtotal, VAT, and gross total. */
export function calculateTotals(invoice: Invoice): InvoiceTotals {
  const subtotalCents = subtotal(invoice.lineItems);
  const vatCents = vatFor(subtotalCents);
  return {
    subtotalCents,
    vatRate: VAT_RATE,
    vatCents,
    totalCents: subtotalCents + vatCents,
  };
}
