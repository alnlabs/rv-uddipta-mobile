export type Task = {
  id: number
  title: string
  place: string
  body: string
  status: string
  created_at: string
};

export function taskStatus(status: string) {
  if (status === "in_progress") return "In progress";
  if (status === "done") return "Completed";
  return "Assigned";
}

export function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}
