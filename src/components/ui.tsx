import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({
  className,
  variant = "default",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const variants: Record<string, string> = {
    default:
      "bg-white text-black hover:bg-zinc-200 dark:bg-white dark:text-black font-semibold",
    secondary:
      "bg-zinc-800 text-white hover:bg-zinc-700 border border-white/10",
    outline:
      "border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-black/5 dark:hover:bg-white/10",
    ghost: "bg-transparent hover:bg-black/5 dark:hover:bg-white/10",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-sm rounded-lg",
    md: "h-10 px-5 text-sm rounded-xl",
    lg: "h-12 px-7 text-base rounded-xl",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 backdrop-blur shadow-sm",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-white/10",
        className
      )}
      {...props}
    />
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 px-3 text-sm outline-none focus:ring-2 focus:ring-violet-500",
        props.className
      )}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full rounded-xl border border-zinc-300 dark:border-white/15 bg-white dark:bg-black/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500 min-h-[80px]",
        props.className
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-zinc-200 dark:bg-white/10",
        className
      )}
    />
  );
}
