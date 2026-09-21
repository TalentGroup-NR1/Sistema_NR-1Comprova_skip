import { describe, it, expect } from "vitest";
import { checkColaboradorPulseAlert } from "../PulsoColaboradoresList";

describe("PulsoColaboradoresList - Regra de Alerta de Humor", () => {
  it("deve ativar alerta para humor Muito Mal (score 0)", () => {
    const result = checkColaboradorPulseAlert(0);
    expect(result.isAlert).toBe(true);
    expect(result.emojiData?.label).toBe("Muito Mal");
    expect(result.emojiData?.emoji).toBe("😢");
  });

  it("deve ativar alerta para humor Mal (score 1)", () => {
    const result = checkColaboradorPulseAlert(1);
    expect(result.isAlert).toBe(true);
    expect(result.emojiData?.label).toBe("Mal");
    expect(result.emojiData?.emoji).toBe("😟");
  });

  it("deve ativar alerta para humor Regular (score 2)", () => {
    const result = checkColaboradorPulseAlert(2);
    expect(result.isAlert).toBe(true);
    expect(result.emojiData?.label).toBe("Regular");
    expect(result.emojiData?.emoji).toBe("😐");
  });

  it("deve arredondar valores fracionários <= 2 para alerta", () => {
    // 1.4 arredonda para 1 (Mal) -> Alerta ativo
    const r1 = checkColaboradorPulseAlert(1.4);
    expect(r1.isAlert).toBe(true);
    expect(r1.emojiData?.score).toBe(1);

    // 2.4 arredonda para 2 (Regular) -> Alerta ativo
    const r2 = checkColaboradorPulseAlert(2.4);
    expect(r2.isAlert).toBe(true);
    expect(r2.emojiData?.score).toBe(2);
  });

  it("NÃO deve ativar alerta para valores arredondados para 3 ou superior", () => {
    // 2.5 arredonda para 3 (Bem) -> Sem alerta
    const rBorder = checkColaboradorPulseAlert(2.5);
    expect(rBorder.isAlert).toBe(false);
    expect(rBorder.emojiData?.label).toBe("Bem");
    expect(rBorder.emojiData?.emoji).toBe("🙂");

    // 3 (Bem) -> Sem alerta
    const r3 = checkColaboradorPulseAlert(3);
    expect(r3.isAlert).toBe(false);

    // 4 (Muito Bem) -> Sem alerta
    const r4 = checkColaboradorPulseAlert(4);
    expect(r4.isAlert).toBe(false);

    // 5 (Excelente) -> Sem alerta
    const r5 = checkColaboradorPulseAlert(5);
    expect(r5.isAlert).toBe(false);
  });

  it("NÃO deve ativar alerta para colaborador sem respostas (null ou undefined)", () => {
    const rNull = checkColaboradorPulseAlert(null);
    expect(rNull.isAlert).toBe(false);
    expect(rNull.emojiData).toBeNull();

    const rUndef = checkColaboradorPulseAlert(undefined);
    expect(rUndef.isAlert).toBe(false);
    expect(rUndef.emojiData).toBeNull();
  });
});
