"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown } from "lucide-react";

export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Button ─────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:pointer-events-none disabled:opacity-45";
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-ink text-canvas hover:bg-[#2c2920] shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-2/40 hover:bg-paper",
  ghost: "text-ink-2 hover:text-ink hover:bg-sunken",
  danger: "text-danger hover:bg-danger-soft",
};
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-9 px-4 text-[13.5px] rounded-md",
  lg: "h-11 px-5 text-[14.5px] rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-sunken hover:text-ink disabled:opacity-40",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ── Form fields ───────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  optional,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  htmlFor?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 text-[13px] font-medium text-ink">
        {label}
        {optional && <span className="text-[12px] font-normal text-muted">Optional</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12px] leading-snug text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT =
  "h-10 w-full rounded-md border border-line-strong bg-surface px-3 text-[14px] text-ink placeholder:text-faint transition-[border-color,box-shadow] hover:border-ink-2/35 focus:border-brass focus:outline-none focus:ring-3 focus:ring-brass/15 disabled:bg-sunken disabled:text-muted";

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cn(INPUT, className)} {...rest} />;
});

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(INPUT, "appearance-none pr-9", className)} {...rest}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** Numeric input with a unit suffix. Emits null for empty. */
export function NumberInput({
  value,
  onChange,
  unit,
  min,
  max,
  step = 0.1,
  disabled,
  id,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        aria-label={ariaLabel}
        className={cn(INPUT, "tabular", unit && "pr-12")}
        value={value ?? ""}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(null);
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(n);
        }}
      />
      {unit && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-muted">{unit}</span>
      )}
    </div>
  );
}

/* ── Segmented control ─────────────────────────────────────────────── */

export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  size = "md",
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex rounded-md border border-line bg-sunken p-0.5", className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-[5px] px-3 font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-150",
              size === "sm" ? "h-7 text-[12.5px]" : "h-8 text-[13px]",
              active ? "bg-surface text-ink shadow-[0_1px_2px_rgb(25_23_18/0.08)]" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Choice tile (single / multi select) ───────────────────────────── */

export function ChoiceTile({
  selected,
  onClick,
  title,
  description,
  icon,
  multi,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  multi?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-start gap-1 rounded-lg border bg-surface p-3.5 text-left transition-[border-color,box-shadow,background-color] duration-150",
        selected
          ? "border-ink shadow-[0_0_0_1px_var(--color-ink)]"
          : "border-line hover:border-line-strong hover:bg-paper",
        className,
      )}
    >
      {icon && <span className={cn("mb-1.5 text-ink-2 transition-colors", selected && "text-brass")}>{icon}</span>}
      <span className="text-[13.5px] font-medium text-ink">{title}</span>
      {description && <span className="text-[12px] leading-snug text-muted">{description}</span>}
      <span
        className={cn(
          "absolute right-3 top-3 flex h-4 w-4 items-center justify-center border transition-colors",
          multi ? "rounded-[4px]" : "rounded-full",
          selected ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface",
        )}
      >
        {selected && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </button>
  );
}

/* ── Toggle chip ───────────────────────────────────────────────────── */

export function Chip({
  active,
  onClick,
  children,
  swatch,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  swatch?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
        active ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
        className,
      )}
    >
      {swatch && <span className="h-2 w-2 rounded-full" style={{ background: swatch }} />}
      {children}
    </button>
  );
}

/* ── Badge ─────────────────────────────────────────────────────────── */

type BadgeTone = "neutral" | "brass" | "ok" | "warn" | "danger";
const BADGE: Record<BadgeTone, string> = {
  neutral: "bg-sunken text-ink-2",
  brass: "bg-brass-soft text-brass-ink",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded-sm px-1.5 text-[11.5px] font-semibold", BADGE[tone], className)}>
      {children}
    </span>
  );
}

/* ── Switch ────────────────────────────────────────────────────────── */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-ink-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[18px] w-8 shrink-0 rounded-full transition-colors",
          checked ? "bg-ink" : "bg-line-strong",
        )}
      >
        <span
          className={cn(
            "absolute top-[2px] left-0 h-[14px] w-[14px] rounded-full bg-surface shadow transition-transform",
            checked ? "translate-x-[16px]" : "translate-x-[2px]",
          )}
        />
      </button>
      {label}
    </label>
  );
}

/* ── Section heading ───────────────────────────────────────────────── */

export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="font-display text-[30px] leading-[1.15] tracking-[-0.01em] text-ink sm:text-[34px]">{title}</h1>
      {description && <p className="max-w-[56ch] text-[14.5px] leading-relaxed text-ink-2">{description}</p>}
    </div>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-lg border border-line bg-surface shadow-panel", className)}>{children}</div>;
}
