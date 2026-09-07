"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft, Download, Sparkles, Loader2, Plus, Trash2,
  Gauge, CheckCircle2, XCircle, Save,
} from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Button, Card, Input, Textarea, Badge } from "@/components/ui";
import { emptyResume, type BuilderResume } from "@/lib/builder";
import { scoreAts } from "@/lib/ats";

const DRAFT_KEY = "devfolio-resume-draft";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  );
}

const linesToBullets = (t: string) => t.split("\n").map((s) => s.trim()).filter(Boolean);
const bulletsToLines = (b: string[]) => b.join("\n");

export default function ResumeBuilderPage() {
  const { data: session } = useSession();
  const sessionUsername = (session as any)?.username as string | undefined;

  const [doc, setDoc] = useState<BuilderResume>(() => emptyResume());
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [fetchUser, setFetchUser] = useState("");
  const [fetchReqs, setFetchReqs] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [atsOpen, setAtsOpen] = useState(false);
  const [atsJd, setAtsJd] = useState("");
  const [summoning, setSummoning] = useState(false);
  const [summonMsg, setSummonMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const set = (patch: Partial<BuilderResume>) => setDoc((d) => ({ ...d, ...patch }));

  // Load draft / prefill once
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        setDoc({ ...emptyResume(), ...JSON.parse(raw) });
      } else if (session?.user?.name) {
        setDoc((d) => ({ ...d, fullName: session.user!.name ?? "" }));
      }
    } catch { /* ignore */ }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionUsername && !fetchUser) setFetchUser(sessionUsername);
    if (sessionUsername && !doc.github) {
      setDoc((d) => (d.github ? d : { ...d, github: `https://github.com/${sessionUsername}` }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUsername]);

  // Autosave draft
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(doc));
        setSaved(true);
        setTimeout(() => setSaved(false), 1200);
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [doc, loaded]);

  const ats = useMemo(() => scoreAts(doc, atsJd), [doc, atsJd, atsOpen]);

  async function generateSummaryAI() {
    setSummoning(true);
    setSummonMsg(null);
    try {
      const skills = doc.skillGroups.flatMap((g) => g.value.split(",")).map((s) => s.trim()).filter(Boolean);
      const res = await fetch("/api/resume/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: doc.targetRole,
          skills,
          projects: doc.projects,
          experience: doc.experience,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      set({ summary: data.summary });
      setSummonMsg(data.ai ? "AI-written summary inserted — edit it to make it yours." : "AI unavailable — template summary inserted, edit freely.");
    } catch (e: any) {
      setSummonMsg(e.message);
    } finally {
      setSummoning(false);
    }
  }

  async function fetchTopProjects() {
    if (!fetchUser.trim()) { setFetchMsg("Enter a GitHub username first."); return; }
    setFetching(true);
    setFetchMsg(null);
    try {
      const q = new URLSearchParams({
        username: fetchUser.trim(),
        role: doc.targetRole,
        requirements: fetchReqs,
      });
      const res = await fetch(`/api/resume/projects?${q}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Fetch failed");
      const mapped = data.projects.map((p: any) => ({
        name: p.name,
        tech: p.tech,
        link: p.link,
        bullets: [p.summary, p.highlight].filter(Boolean),
      }));
      setDoc((d) => ({ ...d, projects: mapped }));
      setFetchMsg(data.matched ? `Added top ${mapped.length} role-matched projects.` : "No strong matches — added closest repos by stars. Edit freely.");
    } catch (e: any) {
      setFetchMsg(e.message);
    } finally {
      setFetching(false);
    }
  }

  async function downloadPdf() {
    if (!doc.fullName.trim()) { alert("Please enter your full name first."); return; }
    setDownloading(true);
    try {
      const res = await fetch("/api/resume/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(doc),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? "PDF failed"); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${doc.fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const scoreColor = ats.score >= 80 ? "text-emerald-500" : ats.score >= 60 ? "text-amber-500" : "text-red-500";

  return (
    <div>
      <Navbar username={sessionUsername} />
      <main className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
              <ArrowLeft size={14} /> home
            </Link>
            <h1 className="text-3xl font-black tracking-tight mt-1">Resume Builder</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Jake&apos;s-resume style · auto-saved draft {saved && <span className="text-emerald-500 inline-flex items-center gap-1"><Save size={12} /> saved</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAtsOpen((v) => !v)}>
              <Gauge size={16} /> ATS Score
            </Button>
            <Button onClick={downloadPdf} disabled={downloading}>
              {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download PDF
            </Button>
          </div>
        </div>

        {atsOpen && (
          <Card className="mt-4 p-5">
            <div className="flex items-center gap-4">
              <div className={`text-5xl font-black ${scoreColor}`}>{ats.score}</div>
              <div>
                <div className="font-bold">ATS Score / 100</div>
                <p className="text-sm text-zinc-500">
                  {ats.score >= 80 ? "Strong — ready to send." : ats.score >= 60 ? "Good — fix the red items." : "Needs work — follow the tips below."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {ats.checks.map((c) => (
                <div key={c.label} className={`rounded-xl border p-3 text-sm ${
                  c.status === "pass" ? "border-emerald-500/40 bg-emerald-500/5"
                  : c.status === "na" ? "border-zinc-300 dark:border-white/15 opacity-70"
                  : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start gap-2 font-medium">
                    {c.status === "pass" ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      : c.status === "na" ? <span className="text-zinc-400 font-bold shrink-0 mt-0.5 text-xs border rounded px-1">N/A</span>
                      : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                    {c.label}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{c.detail}</p>
                  {c.status === "fail" && <p className="mt-1 text-xs text-violet-600 dark:text-violet-300">Fix: {c.tip}</p>}
                </div>
              ))}
            </div>

            {ats.knockouts.length > 0 && (
              <div className="mt-3 rounded-xl border border-zinc-200 dark:border-white/10 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Hard filters (auto-reject checks)</div>
                <div className="mt-2 space-y-1.5">
                  {ats.knockouts.map((k) => (
                    <div key={k.label} className="flex items-start gap-2 text-sm">
                      {k.status === "pass" ? <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                        : k.status === "unknown" ? <span className="text-amber-500 font-bold shrink-0 text-xs border rounded px-1 mt-0.5">?</span>
                        : <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                      <span><b>{k.label}:</b> {k.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ats.jdPresent && (
              <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-emerald-500/30 p-3">
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">Matched keywords ({ats.matchedKeywords.length})</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ats.matchedKeywords.map((k) => <Badge key={k}>{k}</Badge>)}
                    {ats.matchedKeywords.length === 0 && <span className="text-xs text-zinc-500">None yet.</span>}
                  </div>
                </div>
                <div className="rounded-xl border border-red-500/30 p-3">
                  <div className="font-bold text-red-500">Missing keywords ({ats.missingKeywords.length})</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ats.missingKeywords.slice(0, 20).map((k) => <Badge key={k}>{k}</Badge>)}
                    {ats.missingKeywords.length === 0 && <span className="text-xs text-zinc-500">Full coverage.</span>}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-3">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Job description <span className="font-normal normal-case">(paste the posting for keyword, title, years & degree matching)</span>
              </label>
              <Textarea
                className="mt-1"
                rows={5}
                value={atsJd}
                onChange={(e) => setAtsJd(e.target.value)}
                placeholder={"Paste the full job posting here — title, requirements, experience, degree…"}
              />
            </div>
          </Card>
        )}

        <div className="mt-6 grid lg:grid-cols-2 gap-6 items-start">
          {/* ===== FORM ===== */}
          <div className="space-y-4">
            <SectionCard title="Personal & Links">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Full name"><Input value={doc.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="Jane Doe" /></Field>
                <Field label="Target role (drives top-3 projects + ATS keywords)"><Input value={doc.targetRole} onChange={(e) => set({ targetRole: e.target.value })} placeholder="Frontend Developer" /></Field>
                <Field label="Email"><Input value={doc.email} onChange={(e) => set({ email: e.target.value })} placeholder="jane@mail.com" /></Field>
                <Field label="Phone"><Input value={doc.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+1 555 0100" /></Field>
                <Field label="Location"><Input value={doc.location} onChange={(e) => set({ location: e.target.value })} placeholder="Bengaluru, India" /></Field>
                <Field label="GitHub"><Input value={doc.github} onChange={(e) => set({ github: e.target.value })} placeholder="https://github.com/jane" /></Field>
                <Field label="LinkedIn"><Input value={doc.linkedin} onChange={(e) => set({ linkedin: e.target.value })} placeholder="https://linkedin.com/in/jane" /></Field>
                <Field label="LeetCode"><Input value={doc.leetcode} onChange={(e) => set({ leetcode: e.target.value })} placeholder="https://leetcode.com/u/jane" /></Field>
                <Field label="Website"><Input value={doc.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://jane.dev" /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Other link label"><Input value={doc.otherLinkLabel} onChange={(e) => set({ otherLinkLabel: e.target.value })} placeholder="Kaggle" /></Field>
                  <Field label="Other link URL"><Input value={doc.otherLinkUrl} onChange={(e) => set({ otherLinkUrl: e.target.value })} placeholder="https://…" /></Field>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Summary — write it yourself or generate with AI"
              action={
                <Button size="sm" variant="secondary" onClick={generateSummaryAI} disabled={summoning}>
                  {summoning ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {summoning ? "Writing…" : "Generate with AI"}
                </Button>
              }
            >
              <Textarea rows={3} value={doc.summary} onChange={(e) => set({ summary: e.target.value })} placeholder="2–3 lines: role, years, stack, strongest proof point… or hit Generate with AI" />
              {summonMsg && <p className="text-xs text-zinc-500">{summonMsg}</p>}
            </SectionCard>

            <SectionCard
              title="Education"
              action={<Button size="sm" variant="outline" onClick={() => set({ education: [...doc.education, { school: "", degree: "", field: "", location: "", start: "", end: "", grade: "" }] })}><Plus size={14} /> Add</Button>}
            >
              {doc.education.map((e, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/10 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input value={e.school} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, school: ev.target.value } : x) })} placeholder="School / University" />
                    <Input value={e.location} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, location: ev.target.value } : x) })} placeholder="Location" />
                    <Input value={e.degree} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, degree: ev.target.value } : x) })} placeholder="Degree, e.g. B.Tech" />
                    <Input value={e.field} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, field: ev.target.value } : x) })} placeholder="Field, e.g. Computer Science" />
                    <Input value={e.start} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, start: ev.target.value } : x) })} placeholder="Start, e.g. 2021" />
                    <Input value={e.end} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, end: ev.target.value } : x) })} placeholder="End, e.g. 2025" />
                    <Input value={e.grade} onChange={(ev) => set({ education: doc.education.map((x, j) => j === i ? { ...x, grade: ev.target.value } : x) })} placeholder="Grade / CGPA (optional)" />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => set({ education: doc.education.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</Button>
                </div>
              ))}
              {doc.education.length === 0 && <p className="text-sm text-zinc-500">No education added yet.</p>}
            </SectionCard>

            <SectionCard
              title="Experience"
              action={<Button size="sm" variant="outline" onClick={() => set({ experience: [...doc.experience, { title: "", company: "", location: "", start: "", end: "", bullets: [] }] })}><Plus size={14} /> Add</Button>}
            >
              {doc.experience.map((e, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/10 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input value={e.title} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, title: ev.target.value } : x) })} placeholder="Job title" />
                    <Input value={e.company} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, company: ev.target.value } : x) })} placeholder="Company" />
                    <Input value={e.location} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, location: ev.target.value } : x) })} placeholder="Location" />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={e.start} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, start: ev.target.value } : x) })} placeholder="Start" />
                      <Input value={e.end} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, end: ev.target.value } : x) })} placeholder="End" />
                    </div>
                  </div>
                  <Textarea rows={3} value={bulletsToLines(e.bullets)} onChange={(ev) => set({ experience: doc.experience.map((x, j) => j === i ? { ...x, bullets: linesToBullets(ev.target.value) } : x) })} placeholder={"One achievement per line:\nBuilt checkout flow raising conversion 12%\nLed team of 4 engineers…"} />
                  <Button size="sm" variant="ghost" onClick={() => set({ experience: doc.experience.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</Button>
                </div>
              ))}
              {doc.experience.length === 0 && <p className="text-sm text-zinc-500">No experience added yet.</p>}
            </SectionCard>

            <SectionCard title="Projects (top 3 auto-matched to your role)">
              <div className="rounded-xl bg-violet-500/10 border border-violet-500/30 p-3 space-y-2">
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input value={fetchUser} onChange={(e) => setFetchUser(e.target.value)} placeholder="GitHub username" />
                  <Input value={fetchReqs} onChange={(e) => setFetchReqs(e.target.value)} placeholder="Extra requirements (optional)" />
                </div>
                <Button size="sm" onClick={fetchTopProjects} disabled={fetching}>
                  {fetching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {fetching ? "Analyzing repos…" : "Fetch top 3 for my role"}
                </Button>
                {fetchMsg && <p className="text-xs text-zinc-600 dark:text-zinc-300">{fetchMsg}</p>}
              </div>
              {doc.projects.map((p, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/10 p-3 space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <Input value={p.name} onChange={(ev) => set({ projects: doc.projects.map((x, j) => j === i ? { ...x, name: ev.target.value } : x) })} placeholder="Project name" />
                    <Input value={p.link} onChange={(ev) => set({ projects: doc.projects.map((x, j) => j === i ? { ...x, link: ev.target.value } : x) })} placeholder="Link" />
                  </div>
                  <Input value={p.tech} onChange={(ev) => set({ projects: doc.projects.map((x, j) => j === i ? { ...x, tech: ev.target.value } : x) })} placeholder="Tech stack, e.g. React, TypeScript, Postgres" />
                  <Textarea rows={3} value={bulletsToLines(p.bullets)} onChange={(ev) => set({ projects: doc.projects.map((x, j) => j === i ? { ...x, bullets: linesToBullets(ev.target.value) } : x) })} placeholder="One bullet per line" />
                  <Button size="sm" variant="ghost" onClick={() => set({ projects: doc.projects.filter((_, j) => j !== i) })}><Trash2 size={14} /> Remove</Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set({ projects: [...doc.projects, { name: "", tech: "", link: "", bullets: [] }] })}><Plus size={14} /> Add manually</Button>
            </SectionCard>

            <SectionCard title="Skills">
              {doc.skillGroups.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input className="w-44 shrink-0" value={g.label} onChange={(ev) => set({ skillGroups: doc.skillGroups.map((x, j) => j === i ? { ...x, label: ev.target.value } : x) })} placeholder="Group" />
                  <Input value={g.value} onChange={(ev) => set({ skillGroups: doc.skillGroups.map((x, j) => j === i ? { ...x, value: ev.target.value } : x) })} placeholder="Comma-separated skills" />
                  <Button size="sm" variant="ghost" onClick={() => set({ skillGroups: doc.skillGroups.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set({ skillGroups: [...doc.skillGroups, { label: "", value: "" }] })}><Plus size={14} /> Add group</Button>
            </SectionCard>

            <SectionCard
              title="Achievements"
              action={<Button size="sm" variant="outline" onClick={() => set({ achievements: [...doc.achievements, { title: "", detail: "" }] })}><Plus size={14} /> Add</Button>}
            >
              {doc.achievements.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={a.title} onChange={(ev) => set({ achievements: doc.achievements.map((x, j) => j === i ? { ...x, title: ev.target.value } : x) })} placeholder="Title, e.g. Hackathon winner" />
                  <Input value={a.detail} onChange={(ev) => set({ achievements: doc.achievements.map((x, j) => j === i ? { ...x, detail: ev.target.value } : x) })} placeholder="Detail" />
                  <Button size="sm" variant="ghost" onClick={() => set({ achievements: doc.achievements.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
                </div>
              ))}
              {doc.achievements.length === 0 && <p className="text-sm text-zinc-500">None yet.</p>}
            </SectionCard>

            <SectionCard
              title="Custom sections"
              action={<Button size="sm" variant="outline" onClick={() => set({ customSections: [...doc.customSections, { title: "", bullets: [] }] })}><Plus size={14} /> Add</Button>}
            >
              {doc.customSections.map((c, i) => (
                <div key={i} className="rounded-xl border border-zinc-200 dark:border-white/10 p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={c.title} onChange={(ev) => set({ customSections: doc.customSections.map((x, j) => j === i ? { ...x, title: ev.target.value } : x) })} placeholder="Section title, e.g. Certifications" />
                    <Button size="sm" variant="ghost" onClick={() => set({ customSections: doc.customSections.filter((_, j) => j !== i) })}><Trash2 size={14} /></Button>
                  </div>
                  <Textarea rows={2} value={bulletsToLines(c.bullets)} onChange={(ev) => set({ customSections: doc.customSections.map((x, j) => j === i ? { ...x, bullets: linesToBullets(ev.target.value) } : x) })} placeholder="One item per line" />
                </div>
              ))}
              {doc.customSections.length === 0 && <p className="text-sm text-zinc-500">E.g. Certifications, Publications, Volunteering.</p>}
            </SectionCard>
          </div>

          {/* ===== JAKE-STYLE PREVIEW ===== */}
          <div className="lg:sticky lg:top-20">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold">Live preview <span className="text-xs font-normal text-zinc-500">(Jake&apos;s resume style)</span></h2>
              <Badge>ATS {ats.score}</Badge>
            </div>
            <article className="bg-white text-zinc-900 rounded-xl shadow-sm border border-zinc-200 p-8 text-[13px] leading-snug">
              <h1 className="text-center text-2xl font-bold tracking-wide">{doc.fullName || "Your Name"}</h1>
              <p className="text-center text-[11px] mt-1 text-zinc-700">
                {[doc.phone, doc.email, doc.linkedin, doc.github, doc.leetcode, doc.website, doc.otherLinkUrl].filter((x) => x.trim()).join("  |  ") || "phone  |  email  |  links…"}
              </p>

              {doc.summary.trim() && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">SUMMARY</h3>
                  <p className="mt-1">{doc.summary}</p>
                </section>
              )}

              {doc.education.some((e) => e.school || e.degree) && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">EDUCATION</h3>
                  {doc.education.filter((e) => e.school || e.degree).map((e, i) => (
                    <div key={i} className="mt-1">
                      <div className="flex justify-between"><b>{e.school}</b><span>{e.location}</span></div>
                      <div className="flex justify-between italic"><span>{[e.degree, e.field].filter(Boolean).join(", ")}{e.grade ? ` — Grade: ${e.grade}` : ""}</span><span>{[e.start, e.end].filter(Boolean).join(" – ")}</span></div>
                    </div>
                  ))}
                </section>
              )}

              {doc.experience.some((e) => e.title || e.company) && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">EXPERIENCE</h3>
                  {doc.experience.filter((e) => e.title || e.company).map((e, i) => (
                    <div key={i} className="mt-1">
                      <div className="flex justify-between"><b>{e.title}</b><span>{[e.start, e.end].filter(Boolean).join(" – ")}</span></div>
                      <div className="flex justify-between italic"><span>{e.company}</span><span>{e.location}</span></div>
                      <ul className="list-disc ml-5 mt-0.5">{e.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>
                    </div>
                  ))}
                </section>
              )}

              {doc.projects.some((p) => p.name) && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">PROJECTS</h3>
                  {doc.projects.filter((p) => p.name).map((p, i) => (
                    <div key={i} className="mt-1">
                      <div><b>{p.name}</b>{p.tech ? <span>  |  <i>{p.tech}</i></span> : null}</div>
                      {p.link && <div className="text-[11px] text-blue-800 break-all">{p.link}</div>}
                      <ul className="list-disc ml-5 mt-0.5">{p.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>
                    </div>
                  ))}
                </section>
              )}

              {doc.skillGroups.some((g) => g.value.trim()) && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">TECHNICAL SKILLS</h3>
                  {doc.skillGroups.filter((g) => g.value.trim()).map((g, i) => (
                    <div key={i} className="mt-0.5"><b>{g.label || "Skills"}: </b><span>{g.value}</span></div>
                  ))}
                </section>
              )}

              {doc.achievements.some((a) => a.title || a.detail) && (
                <section className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">ACHIEVEMENTS</h3>
                  <ul className="list-disc ml-5 mt-1">
                    {doc.achievements.filter((a) => a.title || a.detail).map((a, i) => (
                      <li key={i}>{a.title}{a.title && a.detail ? " — " : ""}{a.detail}</li>
                    ))}
                  </ul>
                </section>
              )}

              {doc.customSections.filter((c) => c.title).map((c, i) => (
                <section key={i} className="mt-3">
                  <h3 className="font-bold text-[12px] tracking-wide border-b border-black pb-0.5">{c.title.toUpperCase()}</h3>
                  <ul className="list-disc ml-5 mt-1">{c.bullets.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}</ul>
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
