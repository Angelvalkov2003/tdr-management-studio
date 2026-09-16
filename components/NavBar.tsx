"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TASK_PEOPLE } from "@/lib/constants";
import { useCurrentPerson } from "@/lib/use-current-person";
import type { TaskAssignee } from "@/types";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { person, setPerson } = useCurrentPerson();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const linkClass = (href: string) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      pathname === href || (href !== "/tasks" && pathname.startsWith(href))
        ? "bg-slate-900 text-white"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="text-sm font-semibold tracking-tight text-slate-900">
            TDR Studio
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/tasks" className={linkClass("/tasks")}>
              Tasks
            </Link>
            <Link href="/salaries" className={linkClass("/salaries")}>
              Salaries
            </Link>
          </nav>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline">Acting as</span>
            <select
              value={person}
              onChange={(e) =>
                setPerson((e.target.value || "") as TaskAssignee | "")
              }
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-slate-400"
            >
              <option value="">Not set</option>
              {TASK_PEOPLE.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
