"use client";

import { useEffect, useState } from "react";
import { CURRENT_PERSON_KEY, TASK_PEOPLE } from "@/lib/constants";
import type { TaskAssignee } from "@/types";

export function useCurrentPerson() {
  const [person, setPersonState] = useState<TaskAssignee | "">("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CURRENT_PERSON_KEY);
      if (stored && (TASK_PEOPLE as string[]).includes(stored)) {
        setPersonState(stored as TaskAssignee);
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  function setPerson(value: TaskAssignee | "") {
    setPersonState(value);
    try {
      if (value) {
        localStorage.setItem(CURRENT_PERSON_KEY, value);
      } else {
        localStorage.removeItem(CURRENT_PERSON_KEY);
      }
    } catch {
      // ignore
    }
  }

  return { person, setPerson, ready, actor: person || null };
}
