import { describe, it, expect } from "vitest";
import { formatInvoiceSummary } from "../src/format.js";
import { type Invoice } from "../src/billing.js";

const sampleInvoice: Invoice = {
  id: "INV-1001",
  customer: "Acme GmbH",
  lineItems: [
    { description: "Workshop seat", quantity: 2, unitPriceCents: 50000 },
    { description: "Handout pack", quantity: 3, unitPriceCents: 1500 },
  ],
};

describe("formatInvoiceSummary", () => {
  it("renders subtotal, VAT and total", () => {
    const summary = formatInvoiceSummary(sampleInvoice);
    expect(summary).toContain("Invoice INV-1001 for Acme GmbH");
    expect(summary).toContain("Subtotal: €1045.00");
    expect(summary).toContain("VAT (19%): €198.55");
    expect(summary).toContain("Total: €1243.55");
  });
});
