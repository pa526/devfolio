import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ArrowLeft, Star } from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Badge } from "@/components/ui";
import { getPortfolioData } from "@/lib/portfolio";
import { tailorRepos } from "@/lib/matcher";
import { BG_COLORS, normalizeBg, normalizeTemplate, buildResumeQuery } from "@/lib/resume-style";
import ResumeCustomizer from "@/components/resume-customizer";

export const revalidate = 120;

const PREVIEW_BG: Record<string, string> = {
  white: "bg-white dark:bg-zinc-900/60",
  slate: "bg-slate-50 dark:bg-zinc-900/60",
  cream: "bg-amber-50",
  sky: "bg-sky-50",
  mint: "bg-emerald-50",
  lavender: "bg-violet-50",
  rose: "bg-rose-50",
};

export default async function ResumePreview({
  params,
  searchParams,
}: {
  params: { username: string };
  searchParams: { role?: string; requirements?: string; template?: string; bg?: string; count?: string };
}) {
  const data = await getPortfolioData(params.username);
  if (!data) return notFound();

  const prefs = {
    role: searchParams.role ?? "",
    requirements: searchParams.requirements ?? "",
    template: searchParams.template ?? "modern",
    bg: searchParams.bg ?? "white",
    count: searchParams.count ?? "6",
  };
  const template = normalizeTemplate(prefs.template);
  const bgKey = normalizeBg(prefs.bg);

  const tailored = await tailorRepos(data.repos, {
    role: prefs.role,
    requirements: prefs.requirements,
    count: Number(prefs.count) || 6,
  });
  const top = tailored.repos;

  const query = buildResumeQuery(prefs);
  const accent = template === "minimal" ? "text-zinc-800" : "text-violet-600";

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-8 space-y-6">
        <Link href={`/${data.username}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
          <ArrowLeft size={14} /> back to portfolio
        </Link>

        <ResumeCustomizer username={data.username} initial={prefs} />

        {tailored.tailored && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${tailored.matched ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
            {tailored.matched ? (
              <>Showing <b>{top.length}</b> of {data.repos.length} repos best matching <b>{prefs.role || "your requirements"}</b>.</>
            ) : (
              <>No strong matches for “{prefs.role || "these requirements"}” — showing closest repos by stars instead. Try adding more keywords.</>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Template: <b className="capitalize">{template}</b> · Background: <b>{BG_COLORS[bgKey]?.label}</b>
          </p>
          <a
            href={`/api/resume/${data.username}?${query}`}
            download
            className="h-10 px-5 rounded-xl bg-black text-white dark:bg-white dark:text-black text-sm font-semibold inline-flex items-center gap-2 shrink-0"
          >
            <Download size={16} /> Download PDF
          </a>
        </div>

        {/* Résumé sheet */}
        <article className={`text-zinc-900 rounded-2xl border border-zinc-200 shadow-sm p-8 sm:p-10 ${PREVIEW_BG[bgKey] ?? PREVIEW_BG.white}`}>
          <header className={`pb-5 ${template === "bold" ? "bg-zinc-900 text-white -m-8 sm:-m-10 mb-5 p-8 sm:p-10 rounded-t-2xl" : `border-b ${template === "minimal" ? "border-zinc-300" : "border-violet-600/40"}`}`}>
            <h1 className="text-3xl font-black tracking-tight">{data.name}</h1>
            <p className={`mt-1 text-sm ${template === "bold" ? "text-zinc-300" : "text-zinc-500"}`}>
              @{data.username} · {data.githubUrl} · {data.repos.length} public repos · {data.totalStars} stars
            </p>
            {prefs.role && (
              <p className={`mt-1 text-sm font-bold ${template === "bold" ? "text-violet-300" : accent}`}>
                Target role: {prefs.role}
              </p>
            )}
          </header>

          <section className="mt-5">
            <h2 className={`text-xs font-bold tracking-widest ${template === "bold" ? "text-zinc-900" : accent}`}>PROFESSIONAL SUMMARY</h2>
            <p className="mt-2 text-sm leading-relaxed">
              {data.bio?.trim() ? `${data.bio.trim()} ` : ""}
              Software developer with {data.repos.length} public projects on GitHub
              {data.totalStars > 0 ? `, earning ${data.totalStars} stars` : ""}
              {prefs.role ? `, tailored for ${prefs.role} roles` : ""}. Selected work below
              highlights real, shipped code.
            </p>
          </section>

          {data.skills.length > 0 && (
            <section className="mt-5">
              <h2 className={`text-xs font-bold tracking-widest ${template === "bold" ? "text-zinc-900" : accent}`}>TECHNICAL SKILLS</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.skills.map((s) => <Badge key={s}>{s}</Badge>)}
              </div>
            </section>
          )}

          <section className="mt-5">
            <h2 className={`text-xs font-bold tracking-widest ${template === "bold" ? "text-zinc-900" : accent}`}>
              {prefs.role ? `RELEVANT PROJECTS — ${prefs.role.toUpperCase()}` : "SELECTED PROJECTS"}
            </h2>
            <div className="mt-3 space-y-4">
              {top.map((r) => (
                <div key={r.name} className="border-b border-zinc-200/70 pb-3 last:border-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-bold">{r.name}</h3>
                    <span className="text-xs text-zinc-500 shrink-0 inline-flex items-center gap-1">
                      {r.language} {r.stars > 0 && <><Star size={11} /> {r.stars}</>}
                    </span>
                  </div>
                  <p className="mt-1 text-sm">{r.tailoredBullet || r.aiSummary || r.description || "Open-source project — see GitHub for details."}</p>
                  {!r.tailoredBullet && r.aiHighlight && (
                    <p className={`mt-1 text-sm ${template === "minimal" ? "text-zinc-600" : "text-violet-700"}`}>✦ {r.aiHighlight}</p>
                  )}
                  {r.aiTags.length > 0 && <p className="mt-1 text-xs text-zinc-500">{r.aiTags.join(", ")}</p>}
                </div>
              ))}
            </div>
          </section>

          <p className="mt-6 text-center text-xs text-zinc-400">Generated with DevFolio — AI-powered GitHub portfolio.</p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
