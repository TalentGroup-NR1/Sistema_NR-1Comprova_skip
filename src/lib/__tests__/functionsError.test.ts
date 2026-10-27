import { describe, it, expect } from "vitest";
import { extractFunctionError } from "../functionsError";

describe("extractFunctionError", () => {
  it("extrai body.error de error.context.json() quando disponível", async () => {
    const error = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({ success: false, error: "CNPJ já cadastrado" }),
      },
    };
    const msg = await extractFunctionError(error);
    expect(msg).toBe("CNPJ já cadastrado");
  });

  it("extrai body.message quando body.error não está presente", async () => {
    const error = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => ({ message: "Requisição inválida" }),
      },
    };
    const msg = await extractFunctionError(error);
    expect(msg).toBe("Requisição inválida");
  });

  it("retorna fallback quando context.json() lança erro e a mensagem é genérica de não-2xx", async () => {
    const error = {
      message: "Edge Function returned a non-2xx status code",
      context: {
        json: async () => {
          throw new Error("Stream already read");
        },
      },
    };
    const msg = await extractFunctionError(error, "Fallback amigável");
    expect(msg).toBe("Fallback amigável");
  });

  it("retorna error.message quando é um Error padrão com mensagem explicativa", async () => {
    const error = new Error("Falha na conexão com o servidor");
    const msg = await extractFunctionError(error);
    expect(msg).toBe("Falha na conexão com o servidor");
  });

  it("retorna a própria string se o erro for uma string", async () => {
    const msg = await extractFunctionError("Erro customizado em string");
    expect(msg).toBe("Erro customizado em string");
  });

  it("retorna fallback padrão quando o erro é nulo ou indefinido", async () => {
    const msg1 = await extractFunctionError(null);
    expect(msg1).toBe("Erro ao processar requisição.");

    const msg2 = await extractFunctionError(undefined, "Fallback custom");
    expect(msg2).toBe("Fallback custom");
  });
});
