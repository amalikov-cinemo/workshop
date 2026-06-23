import { describe, it, expect } from "vitest";
import {
  VAT_RATE,
  subtotal,
  vatFor,
  calculateTotals,
  type Invoice,
} from "../src/billing.js";

const sampleInvoice: Invoice = {
  id: "INV-1001",
  customer: "Acme GmbH",
  lineItems: [
    { description: "Workshop seat", quantity: 2, unitPriceCents: 50000 },
    { description: "Handout pack", quantity: 3, unitPriceCents: 1500 },
  ],
};

describe("subtotal", () => {
  it("sums quantity * unit price in cents", () => {
    expect(subtotal(sampleInvoice.lineItems)).toBe(104500);
  });

  it("rejects non-integer quantity", () => {
    expect(() => subtotal([{ description: "x", quantity: 1.5, unitPriceCents: 100 }])).toThrow();
  });

  it("rejects negative price", () => {
    expect(() => subtotal([{ description: "x", quantity: 1, unitPriceCents: -1 }])).toThrow();
  });
});

describe("VAT (billing logic — high risk)", () => {
  it("uses the German standard rate of 19%", () => {
    expect(VAT_RATE).toBe(0.19);
  });

  it("computes 19% VAT rounded to the nearest cent", () => {
    // 104500 * 0.19 = 19855
    expect(vatFor(104500)).toBe(19855);
  });

  it("rounds half-up to whole cents", () => {
    // 100 * 0.19 = 19 exactly; 105 * 0.19 = 19.95 -> 20
    expect(vatFor(100)).toBe(19);
    expect(vatFor(105)).toBe(20);
  });

  it("produces correct gross total", () => {
    const totals = calculateTotals(sampleInvoice);
    expect(totals.subtotalCents).toBe(104500);
    expect(totals.vatCents).toBe(19855);
    expect(totals.totalCents).toBe(124355);
  });
});
