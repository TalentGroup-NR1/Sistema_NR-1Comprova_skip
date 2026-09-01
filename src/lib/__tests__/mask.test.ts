import { describe, it, expect } from "vitest";
import { maskEmail, maskCpf, maskPhone, maskName } from "../../../supabase/functions/_shared/mask.ts";

describe("PII Masking Helper (_shared/mask.ts)", () => {
  describe("maskEmail", () => {
    it("should mask valid emails correctly", () => {
      expect(maskEmail("josenildo.santos@talentgroup.com.br")).toBe("j***s@talentgroup.com.br");
      expect(maskEmail("admin@empresa.com")).toBe("a***n@empresa.com");
      expect(maskEmail("ab@empresa.com")).toBe("a***@empresa.com");
      expect(maskEmail("a@empresa.com")).toBe("a***@empresa.com");
    });

    it("should handle invalid or empty inputs gracefully", () => {
      expect(maskEmail("")).toBe("***@***");
      expect(maskEmail(null as any)).toBe("***@***");
      expect(maskEmail(undefined as any)).toBe("***@***");
      expect(maskEmail("invalid-email")).toBe("***@***");
    });
  });

  describe("maskCpf", () => {
    it("should mask formatted and unformatted CPFs preserving only 4 digits", () => {
      expect(maskCpf("123.456.789-01")).toBe("123.***.***-01");
      expect(maskCpf("12345678901")).toBe("123.***.***-01");
    });

    it("should handle invalid CPF lengths gracefully", () => {
      expect(maskCpf("")).toBe("***.***.***-**");
      expect(maskCpf("123")).toBe("***.***.***-**");
    });
  });

  describe("maskPhone", () => {
    it("should mask phone numbers preserving only last digits and DDD", () => {
      expect(maskPhone("(11) 98765-4321")).toBe("(11) *****-4321");
      expect(maskPhone("11987654321")).toBe("(11) *****-4321");
    });

    it("should handle empty or short phone numbers", () => {
      expect(maskPhone("")).toBe("(**) *****-****");
      expect(maskPhone("123")).toBe("(**) *****-****");
    });
  });

  describe("maskName", () => {
    it("should mask names for LGPD log compliance", () => {
      expect(maskName("Josenildo Santos")).toBe("J*** S***");
      expect(maskName("Maria Silva Pereira")).toBe("M*** S*** P***");
      expect(maskName("Carlos")).toBe("C***s");
      expect(maskName("")).toBe("***");
    });
  });
});
