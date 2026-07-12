import { describe, it, expect } from "vitest";
import { verifyMidtransSignature, mapAmountToTier } from "@/lib/billing";
import crypto from "crypto";

describe("billing helper", () => {
  it("verifies Midtrans signature correctly for JSON payloads", () => {
    const payload = {
      order_id: "order_12345_abcd",
      status_code: "200",
      gross_amount: "100000",
      transaction_status: "settlement",
    };
    const body = JSON.stringify(payload);
    const key = "secret_server_key";
    const signature = crypto
      .createHash("sha512")
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${key}`)
      .digest("hex");

    process.env.MIDTRANS_SERVER_KEY = key;
    expect(verifyMidtransSignature(body, signature)).toBe(true);
  });

  it("rejects invalid signature", () => {
    const payload = {
      order_id: "order_67890_qwer",
      status_code: "200",
      gross_amount: "150000",
    };
    const body = JSON.stringify(payload);

    process.env.MIDTRANS_SERVER_KEY = "another_key";
    expect(verifyMidtransSignature(body, "invalid_signature")).toBe(false);
  });

  describe("tier mapping", () => {
    it("maps IDR 1,500,000 to enterprise tier", () => {
      const { tier, durationDays } = mapAmountToTier(1_500_000);
      expect(tier).toBe("enterprise");
      expect(durationDays).toBe(365);
    });

    it("maps IDR 1,000,000 exactly to enterprise tier", () => {
      const { tier, durationDays } = mapAmountToTier(1_000_000);
      expect(tier).toBe("enterprise");
      expect(durationDays).toBe(365);
    });

    it("maps IDR 150,000 to pro tier", () => {
      const { tier, durationDays } = mapAmountToTier(150_000);
      expect(tier).toBe("pro");
      expect(durationDays).toBe(30);
    });

    it("maps IDR 100,000 exactly to pro tier", () => {
      const { tier, durationDays } = mapAmountToTier(100_000);
      expect(tier).toBe("pro");
      expect(durationDays).toBe(30);
    });

    it("maps IDR 50,000 to free tier", () => {
      const { tier, durationDays } = mapAmountToTier(50_000);
      expect(tier).toBe("free");
      expect(durationDays).toBe(0);
    });

    it("maps IDR 0 to free tier", () => {
      const { tier, durationDays } = mapAmountToTier(0);
      expect(tier).toBe("free");
      expect(durationDays).toBe(0);
    });
  });
});
