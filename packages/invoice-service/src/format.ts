/**
 * Presentation helpers for invoices. Low risk: formatting only, no money math.
 * See CODEOWNERS — owned by @frontend-platform.
 */
import { calculateTotals, type Invoice } from "./billing.js";

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
    `Invoice #${invoice.id} — ${invoice.customer}`,
    ...lines,
    `Subtotal: €${formatCents(totals.subtotalCents)}`,
    `VAT (${Math.round(totals.vatRate * 100)}%): €${formatCents(totals.vatCents)}`,
    `Total: €${formatCents(totals.totalCents)}`,
  ].join("\n");
}
