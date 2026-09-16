"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const salariesActive =
    pathname === "/salaries" || pathname.startsWith("/salaries/");

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full min-w-0 max-w-[1600px] items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link
            href="/salaries"
            className="shrink-0 text-sm font-semibold tracking-tight text-slate-900"
          >
            TDR Studio
          </Link>
          <nav className="flex min-w-0 items-center gap-1">
            <Link
              href="/salaries"
              className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                salariesActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              Salaries
            </Link>
          </nav>
        </div>

        <button
          type="button"
          onClick={logout}
          className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Log out
        </button>
      </div>
    </header>
  );
}
