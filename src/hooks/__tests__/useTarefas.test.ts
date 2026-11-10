import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase client BEFORE importing hooks
const insertMock = vi.fn(() => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "t1" }, error: null }) }) }));
const updateMock = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }));
const deleteMock = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: vi.fn(() => ({ insert: insertMock, update: updateMock, delete: deleteMock })) },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

import { taskSchema } from "../useTarefas";
import { assertOwnership, TaskForbiddenError } from "@/lib/tarefasAuthz";

describe("tarefas - schema validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("aceita payload válido", () => {
    const v = taskSchema.parse({ title: "Comprar pão", priority: "alta" });
    expect(v.title).toBe("Comprar pão");
    expect(v.priority).toBe("alta");
  });

  it("rejeita título vazio", () => {
    expect(() => taskSchema.parse({ title: "  " })).toThrow();
  });

  it("rejeita prioridade inválida", () => {
    expect(() => taskSchema.parse({ title: "x", priority: "urgente" as any })).toThrow();
  });

  it("rejeita descrição maior que 1000 chars", () => {
    expect(() => taskSchema.parse({ title: "x", description: "a".repeat(1001) })).toThrow();
  });
});

describe("tarefas - ownership", () => {
  it("usuário acessa sua própria tarefa OK", () => {
    expect(() => assertOwnership({ user_id: "user-1" }, "user-1")).not.toThrow();
  });

  it("usuário tenta acessar tarefa de outro → 403", () => {
    expect(() => assertOwnership({ user_id: "user-2" }, "user-1")).toThrow(TaskForbiddenError);
  });

  it("admin tenta acessar tarefa de colaborador → 403", () => {
    expect(() => assertOwnership({ user_id: "colab-1" }, "admin-master")).toThrow(TaskForbiddenError);
  });
});
