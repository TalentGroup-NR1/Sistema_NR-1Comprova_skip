import { describe, it, expect } from "vitest";
import { assertOwnership, isOwner, TaskForbiddenError } from "../tarefasAuthz";

describe("tarefasAuthz", () => {
  const userA = "user-a";
  const userB = "user-b";
  const taskOfA = { user_id: userA };

  it("permits owner access", () => {
    expect(() => assertOwnership(taskOfA, userA)).not.toThrow();
    expect(isOwner(taskOfA, userA)).toBe(true);
  });

  it("blocks another collaborator (403)", () => {
    expect(() => assertOwnership(taskOfA, userB)).toThrow(TaskForbiddenError);
    expect(isOwner(taskOfA, userB)).toBe(false);
  });

  it("blocks an admin trying to read another user's task (403)", () => {
    // Admin role has NO bypass: same ownership rule applies.
    const adminId = "admin-1";
    expect(() => assertOwnership(taskOfA, adminId)).toThrow(TaskForbiddenError);
  });

  it("blocks unauthenticated callers", () => {
    expect(() => assertOwnership(taskOfA, null)).toThrow(TaskForbiddenError);
    expect(() => assertOwnership(taskOfA, undefined)).toThrow(TaskForbiddenError);
  });

  it("blocks when record is missing", () => {
    expect(() => assertOwnership(null, userA)).toThrow(TaskForbiddenError);
  });
});
