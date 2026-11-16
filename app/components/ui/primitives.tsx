import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/*
 * The console's building blocks, drawn from Community Hub's design system:
 * a lime pill for the one main action on a screen, white pills with a pine hairline
 * for everything else, white round controls for icon buttons, flat white panels
 * with hairline borders, and 3rem fields with a leaf focus ring.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "sm" | "icon";
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "default", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold leading-tight whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 motion-reduce:transition-none",
    size === "icon"
      ? "size-11 bg-paper text-pine shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--pine)_20%,transparent)] hover:bg-pine hover:text-paper [&_svg]:size-[1.125rem]"
      : [
          variant === "primary" && "bg-lime text-on-lime hover:bg-lime-deep",
          variant === "secondary" && "border border-[color-mix(in_srgb,var(--pine)_22%,transparent)] bg-paper text-pine hover:border-[color-mix(in_srgb,var(--pine)_40%,transparent)] hover:bg-field",
          variant === "ghost" && "text-pine hover:bg-field",
          variant === "danger" && "border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-paper text-danger hover:bg-danger-soft",
          size === "default" && "min-h-12 px-6 text-base",
          size === "sm" && "min-h-10 px-4 text-[0.9375rem]",
        ],
    className,
  );
}

export function Button({ className, variant = "primary", size = "default", ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

/* A link that looks like a button, so no <button> ever sits inside an <a>. */
export function ButtonLink({ href, variant = "primary", size = "default", className, children }: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode }) {
  return <Link href={href} className={buttonClass(variant, size, className)}>{children}</Link>;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[1.25rem] border border-line bg-paper", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-start justify-between gap-4 p-5 pb-3 sm:p-6 sm:pb-4", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-1 sm:p-6 sm:pt-1", className)} {...props} />;
}

const BADGE_TONES = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-field text-muted",
} as const;

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: keyof typeof BADGE_TONES; className?: string }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold leading-none", BADGE_TONES[tone], className)}>{children}</span>;
}

const control = "w-full rounded-[0.75rem] border border-[var(--control-border)] bg-paper px-4 text-base text-ink outline-none transition-[border-color,box-shadow] focus:border-leaf focus:ring-3 focus:ring-[color-mix(in_srgb,var(--leaf)_22%,transparent)] focus-visible:outline-none disabled:opacity-60";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(control, "h-12", props.className)} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        control,
        "field-chevron h-12 cursor-pointer appearance-none pr-10",
        props.className,
      )}
    />
  );
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(control, "py-3", props.className)} />;
}
export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-2 block text-[0.875rem] font-semibold text-ink", className)} {...props} />;
}
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-[0.75rem] bg-field motion-reduce:animate-none", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-field text-pine [&_svg]:size-5" aria-hidden="true">{icon}</div>
      <h3 className="text-[1.0625rem] font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* A page title and the sentence under it. Nothing sits above the title. */
export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div className="min-w-0">
        <h1 className="text-[clamp(1.875rem,3.2vw,2.5rem)] leading-[1.08] tracking-[-0.026em]">{title}</h1>
        <p className="mt-2.5 max-w-2xl text-[1.0625rem] leading-relaxed text-muted">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const active = ["online", "active"].includes(status);
  const waiting = status === "never";
  return <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", active ? "bg-success" : waiting ? "bg-warning" : "bg-danger")} />;
}

/* A back link above a detail page's title. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link mb-4 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem]">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
      {children}
    </Link>
  );
}
