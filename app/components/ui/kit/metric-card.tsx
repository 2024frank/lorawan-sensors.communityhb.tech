"use client";
import * as React from "react";

/**
 * MetricCard — a single KPI tile. Handles its own loading skeleton and renders a
 * trend that is legible without colour: the direction is an arrow glyph plus a
 * screen-reader sentence, and the semantic tone is applied on top.
 *
 * Edge cases handled: a missing value shows an em dash, long values wrap instead
 * of overflowing, and the number uses tabular figures so a row of cards aligns.
 *
 * @example
 * <MetricCard label="Sensors reporting" value="2 / 3" icon={<Activity/>}
 *   trend={{ direction: "down", label: "1 went quiet", tone: "bad" }} />
 * @example
 * <MetricCard label="Uplinks today" value={count} isLoading={q.isLoading} />
 */
export interface MetricTrend {
  direction: "up" | "down" | "flat";
  label: string;
  /** Semantic meaning of the movement — up isn't always good. */
  tone?: "good" | "bad" | "neutral";
}

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  trend?: MetricTrend;
  isLoading?: boolean;
  className?: string;
}

const ARROW = { up: "↑", down: "↓", flat: "→" } as const;
const TONE = {
  good: "text-success",
  bad: "text-danger",
  neutral: "text-muted",
} as const;

export function MetricCard({ label, value, icon, hint, trend, isLoading, className }: MetricCardProps) {
  return (
    <div className={`rounded-[1.25rem] border border-line bg-paper p-5 sm:p-6 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.9375rem] font-semibold text-ink">{label}</p>
        {icon && <span className="grid size-10 place-items-center rounded-full bg-field text-pine [&_svg]:size-[1.125rem]" aria-hidden="true">{icon}</span>}
      </div>

      {isLoading ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-[0.5rem] bg-field motion-reduce:animate-none" role="status" aria-label={`${label} loading`} />
      ) : (
        <p className="mt-3 break-words text-[2rem] leading-tight font-semibold tracking-[-0.025em] text-pine tabular-nums">
          {value ?? <span className="text-muted">—</span>}
        </p>
      )}

      {!isLoading && (trend || hint) && (
        <div className="mt-1.5 flex items-center gap-2 text-[0.875rem]">
          {trend && (
            <span className={`inline-flex items-center gap-0.5 font-medium ${TONE[trend.tone ?? "neutral"]}`}>
              <span aria-hidden="true">{ARROW[trend.direction]}</span>
              <span>{trend.label}</span>
              <span className="sr-only">
                {trend.direction === "up" ? "up" : trend.direction === "down" ? "down" : "unchanged"}
              </span>
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </div>
  );
}
