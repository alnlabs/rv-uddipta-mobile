export type Task = {
  id: number
  title: string
  place: string
  body: string
  status: string
  created_at: string
  assignee_role?: string | null
  assignee_user_id?: string | null
  frequency?: string | null
};

export function taskFrequencyLabel(value: string | null | undefined) {
  if (value === "daily") return "Daily";
  if (value === "weekly") return "Weekly";
  if (value === "monthly") return "Monthly";
  return "Once";
}

export function taskStatus(status: string, task?: Pick<Task, "assignee_user_id" | "assignee_role">) {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Completed";
  if (task && !task.assignee_user_id && task.assignee_role) return "Open for role";
  return "Assigned";
}

export function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
