"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, Download } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui";
import { TEMPLATES, buildResumeQuery, type ResumePrefs } from "@/lib/resume-style";

export default function ResumeCustomizer({
  username,
  initial,
}: {
  username: string;
  initial: ResumePrefs;
}) {
  const router = useRouter();
  const [role, setRole] = useState(initial.role);
  const [requirements, setRequirements] = useState(initial.requirements);
  const [template, setTemplate] = useState(initial.template);
  const [count, setCount] = useState(initial.count);

  const query = useMemo(
    () => buildResumeQuery({ role, requirements, template, bg: "white", count }),
    [role, requirements, template, count]
  );

  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-5 sm:p-6 space-y-5">
      <div className="flex items-center gap-2 font-bold text-lg">
        <Wand2 size={18} className="text-violet-500" /> Tailor for a role
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Target role</label>
          <Input
            className="mt-1"
            placeholder="e.g. Frontend Developer, Data Engineer…"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
            Projects to include: {count}
          </label>
          <input
            type="range"
            min={2}
            max={12}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="mt-3 w-full accent-violet-600"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
          Key requirements <span className="font-normal normal-case">(paste the job post or list must-have skills)</span>
        </label>
        <Textarea
          className="mt-1"
          rows={4}
          placeholder={"e.g. 3+ years React and TypeScript, REST APIs, testing with Jest, CI/CD…"}
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
        />
      </div>

      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Template</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                template === t.id
                  ? "border-violet-500 ring-2 ring-violet-500/40"
                  : "border-zinc-300 dark:border-white/15 hover:border-violet-400"
              }`}
            >
              <div className="font-bold text-sm">{t.label}</div>
              <div className="text-xs text-zinc-500">{t.blurb}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={() => router.push(`/${username}/resume?${query}`)}>
          <Wand2 size={16} /> Apply — show tailored résumé
        </Button>
        <a href={`/api/resume/${username}?${query}`} download>
          <Button variant="outline"><Download size={16} /> Download PDF</Button>
        </a>
      </div>
      <p className="text-xs text-zinc-500">
        Only repos matching your role are included — ranked by Gemini when an API key is set, otherwise by keyword match.
      </p>
    </div>
  );
}
