/**
 * invoice-service domain logic.
 *
 * Money is represented in integer cents to avoid floating-point drift.
 * VAT is German standard rate (19%). This file is intentionally the
 * "billing / tax" core of the service — changes here are high risk and
 * must go through a human gate even when a fix looks trivial.
 */

/** German standard VAT rate. Changing this is a billing decision, not a code fix. */
export const VAT_RATE = 0.19;

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

function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Human-readable one-line-per-section summary of an invoice. */
export function formatInvoiceSummary(invoice: Invoice): string {
  const totals = calculateTotals(invoice);
  const lines = invoice.lineItems.map(
    (item) =>
      `  ${item.quantity} x ${item.description} @ €${formatCents(item.unitPriceCents)}`,
  );
  return [
    `Invoice ${invoice.id} for ${invoice.customer}`,
    ...lines,
    `Subtotal: €${formatCents(totals.subtotalCents)}`,
    `VAT (${Math.round(totals.vatRate * 100)}%): €${formatCents(totals.vatCents)}`,
    `Total: €${formatCents(totals.totalCents)}`,
  ].join("\n");
}
