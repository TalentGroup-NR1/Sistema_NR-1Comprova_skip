import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { maskEmail, maskCpf, maskPhone, maskName } from "../mask.ts";

Deno.test("maskEmail masks properly in Deno", () => {
  assertEquals(maskEmail("contato@empresa.com.br"), "c***o@empresa.com.br");
  assertEquals(maskEmail(""), "[redacted]");
});

Deno.test("maskCpf masks CPF properly in Deno", () => {
  assertEquals(maskCpf("123.456.789-00"), "123.***.***-00");
  assertEquals(maskCpf("123"), "[redacted]");
});

Deno.test("maskPhone masks phone in Deno", () => {
  assertEquals(maskPhone("(11) 98765-4321"), "(**) *****-4321");
});

Deno.test("maskName masks full name in Deno", () => {
  assertEquals(maskName("Talent Group Brasil"), "Talent G. B.");
});
