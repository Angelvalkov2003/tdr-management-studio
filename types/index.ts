export type TaskStatus =
  | "idea"
  | "todo"
  | "in_progress"
  | "done"
  | "abandoned";

export type TaskAssignee =
  | "Pavel"
  | "Angel"
  | "Tonislav"
  | "Hristo"
  | "Hakan";

export type SalaryPerson = "Angel" | "Tonislav" | "Hristo" | "Hakan";

export type EntityType = "task" | "salary";

export interface Task {
  id: string;
  code: string;
  title: string;
  description: string | null;
  estimate: number;
  assignee: TaskAssignee | null;
  status: TaskStatus;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryRecord {
  id: string;
  person: SalaryPerson;
  year: number;
  month: number;
  paid: boolean;
  days_paid: number | null;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  actor: string | null;
  ip_address: string | null;
  action: string;
  created_at: string;
}
