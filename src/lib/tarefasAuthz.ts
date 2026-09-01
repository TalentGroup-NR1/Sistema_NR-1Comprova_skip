/**
 * Authorization helpers for the Minhas Tarefas module.
 * Tasks are strictly personal: only the owner (auth.uid() === task.user_id) may interact.
 * Admins do NOT have any escalated access to other users' tasks.
 */

export type OwnedRecord = { user_id: string };

export class TaskForbiddenError extends Error {
  status = 403;
  constructor(message = "Forbidden: task does not belong to current user") {
    super(message);
    this.name = "TaskForbiddenError";
  }
}

export function assertOwnership(record: OwnedRecord | null | undefined, currentUserId: string | null | undefined): void {
  if (!currentUserId) throw new TaskForbiddenError("Unauthenticated");
  if (!record) throw new TaskForbiddenError("Record not found");
  if (record.user_id !== currentUserId) throw new TaskForbiddenError();
}

export function isOwner(record: OwnedRecord | null | undefined, currentUserId: string | null | undefined): boolean {
  return !!record && !!currentUserId && record.user_id === currentUserId;
}
