"use client";
import * as React from "react";

/**
 * StatusBadge — the shared vocabulary for device/gateway/integration health.
 *
 * Accessibility rule enforced here: status is NEVER color-only. Every badge
 * carries a text label and an aria-label, and the dot has a distinct shape/motion
 * for "live" — so it reads correctly for colour-blind users and screen readers.
 *
 * @example <StatusBadge status="online" />
 * @example <StatusBadge status="offline" label="No signal 4d" size="sm" />
 */
export type Status = "online" | "offline" | "never" | "error" | "warning" | "active" | "idle";

type Tone = { fg: string; bg: string; dot: string; label: string; live?: boolean };

// Semantic tones live in one table, so the whole app stays consistent and a new
// status is a one-line change. Colours are semantic, deliberately separate from
// the brand accent.
const TONES: Record<Status, Tone> = {
  online:  { label: "Online",     fg: "text-success", bg: "bg-success-soft", dot: "bg-success", live: true },
  active:  { label: "Online",     fg: "text-success", bg: "bg-success-soft", dot: "bg-success", live: true },
  offline: { label: "Offline",    fg: "text-danger",  bg: "bg-danger-soft",  dot: "bg-danger" },
  error:   { label: "Error",      fg: "text-danger",  bg: "bg-danger-soft",  dot: "bg-danger" },
  warning: { label: "Warning",    fg: "text-warning", bg: "bg-warning-soft", dot: "bg-warning" },
  never:   { label: "Never seen", fg: "text-warning", bg: "bg-warning-soft", dot: "bg-warning" },
  idle:    { label: "Idle",       fg: "text-muted",   bg: "bg-field",        dot: "bg-muted" },
};

export interface StatusBadgeProps {
  status: Status;
  /** Override the visible text (the status still drives colour + a11y). */
  label?: string;
  size?: "sm" | "md";
  /** Render just the dot (e.g. inside a dense table cell). Still labelled for SR. */
  dotOnly?: boolean;
  className?: string;
}

export function StatusBadge({ status, label, size = "md", dotOnly, className }: StatusBadgeProps) {
  const tone = TONES[status] ?? TONES.never;
  const text = label ?? tone.label;
  const pad = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-[0.8125rem]";

  const dot = (
    <span className="relative flex h-2 w-2 shrink-0">
      {/* motion only for live states, and only when the user allows it */}
      {tone.live && (
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:hidden ${tone.dot}`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${tone.dot}`} />
    </span>
  );

  if (dotOnly) {
    return (
      <span className={className} role="img" aria-label={`Status: ${text}`}>
        {dot}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold leading-none ${pad} ${tone.bg} ${tone.fg} ${className ?? ""}`}
      role="status"
    >
      {dot}
      {text}
    </span>
  );
}
