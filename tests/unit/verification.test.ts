import { describe, expect, it } from "vitest";
import { ageInYears } from "@/lib/verification/age";
import { sanitizeSelections } from "@/lib/catalog-options";

describe("ageInYears", () => {
  const at = new Date(Date.UTC(2026, 10, 23)); // 23 Nov 2026
  it("counts full years", () => {
    expect(ageInYears("2008-11-23", at)).toBe(18);
    expect(ageInYears("2008-11-24", at)).toBe(17);
    expect(ageInYears("1990-01-01", at)).toBe(36);
  });
  it("rejects malformed dates", () => {
    expect(ageInYears("23.11.2008", at)).toBeNull();
  });
});

describe("sanitizeSelections", () => {
  it("drops unknown keys and values", () => {
    expect(sanitizeSelections({ polishColor: "cherry_red", polishFinish: "neon", evil: "<script>" })).toEqual({ polishColor: "cherry_red" });
  });
});
