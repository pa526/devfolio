export type ResumeTemplate = "modern" | "minimal" | "bold";

export const TEMPLATES: { id: ResumeTemplate; label: string; blurb: string }[] = [
  { id: "modern", label: "Modern", blurb: "Violet accents, friendly" },
  { id: "minimal", label: "Minimal (ATS)", blurb: "Black & white, recruiter-safe" },
  { id: "bold", label: "Bold", blurb: "Dark header band" },
];

export const BG_COLORS: Record<string, { label: string; hex: string }> = {
  white: { label: "White", hex: "#FFFFFF" },
  slate: { label: "Slate", hex: "#F8FAFC" },
  cream: { label: "Cream", hex: "#FFFBEB" },
  sky: { label: "Sky", hex: "#EFF6FF" },
  mint: { label: "Mint", hex: "#ECFDF5" },
  lavender: { label: "Lavender", hex: "#F5F3FF" },
  rose: { label: "Rose", hex: "#FFF1F2" },
};

export function normalizeTemplate(t?: string): ResumeTemplate {
  return t === "minimal" || t === "bold" ? t : "modern";
}

export function normalizeBg(b?: string): string {
  return BG_COLORS[b ?? ""] ? (b as string) : "white";
}

export interface ResumePrefs {
  role: string;
  requirements: string;
  template: string;
  bg: string;
  count: string;
}

/** Shared by the client customizer and the server preview page / API links. */
export function buildResumeQuery(p: ResumePrefs): string {
  const q = new URLSearchParams();
  if (p.role.trim()) q.set("role", p.role.trim());
  if (p.requirements.trim()) q.set("requirements", p.requirements.trim());
  q.set("template", p.template);
  q.set("bg", p.bg);
  q.set("count", p.count);
  return q.toString();
}
