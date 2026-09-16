"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityLog } from "@/types";

const PAGE_SIZE = 20;

export function ActivityLogPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [entries, setEntries] = useState<ActivityLog[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (offset: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/activity?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      if (!res.ok) throw new Error("Failed to load activity");
      const data = await res.json();
      setEntries((prev) =>
        append ? [...prev, ...data.entries] : data.entries,
      );
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void load(0, false);
  }, [load, refreshKey]);

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Activity log</h2>
        <button
          type="button"
          onClick={() => void load(0, false)}
          className="text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          Refresh
        </button>
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <time className="text-xs tabular-nums text-slate-400">
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                  {entry.actor && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                      {entry.actor}
                    </span>
                  )}
                  {entry.ip_address && (
                    <span className="font-mono text-[11px] text-slate-400">
                      {entry.ip_address}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-700">{entry.action}</p>
              </li>
            ))}
          </ul>
        )}

        {hasMore && (
          <div className="mt-3 flex justify-center border-t border-slate-100 pt-3">
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => void load(nextOffset, true)}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
