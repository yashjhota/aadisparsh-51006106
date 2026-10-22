import { describe, expect, it } from "vitest";
import { mobileToEmail, normalizeMobile } from "@/lib/mobile-auth";

describe("mobile login", () => {
  it("accepts 10-digit Indian numbers in common formats", () => {
    expect(normalizeMobile("98765 43210")).toBe("9876543210");
    expect(normalizeMobile("+91 98765-43210")).toBe("9876543210");
    expect(normalizeMobile("09876543210")).toBe("9876543210");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeMobile("12345")).toBeNull();
    expect(normalizeMobile("1234567890")).toBeNull();
  });
  it("maps the same number to the same login", () => {
    expect(mobileToEmail("9876543210")).toBe(mobileToEmail(normalizeMobile("+919876543210")!));
  });
});
