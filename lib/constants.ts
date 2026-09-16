import type { SalaryPerson, TaskAssignee, TaskStatus } from "@/types";

export const TASK_PEOPLE: TaskAssignee[] = [
  "Pavel",
  "Angel",
  "Tonislav",
  "Hristo",
  "Hakan",
];

export const SALARY_PEOPLE: SalaryPerson[] = [
  "Angel",
  "Tonislav",
  "Hristo",
  "Hakan",
];

export const TASK_STATUSES: TaskStatus[] = [
  "idea",
  "todo",
  "in_progress",
  "done",
  "abandoned",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  idea: "Idea",
  todo: "TODO",
  in_progress: "In Progress",
  done: "Done",
  abandoned: "Abandoned",
};

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const CURRENT_PERSON_KEY = "tdr_current_person";
export const SESSION_COOKIE = "tdr_session";
