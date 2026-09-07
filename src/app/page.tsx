import Link from "next/link";
import { FolderGit2, Sparkles, Share2, PencilLine, ArrowRight, Star, Zap, ShieldCheck } from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const username = (session as any)?.username as string | undefined;

  return (
    <div>
      <Navbar username={username} />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pt-16 pb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm font-medium text-violet-700 dark:text-violet-300 mb-6">
            <Sparkles size={16} /> AI-powered · Gemini summaries · Recruiter-ready
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            Turn your messy GitHub
            <br />
            into a{" "}
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent">
              hireable portfolio
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            Sign in with GitHub, let Gemini write polished summaries, tags and
            highlights for every repo — then publish a clean page a recruiter
            can skim in under a minute.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="h-12 px-7 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold inline-flex items-center justify-center gap-2 text-base"
            >
              <FolderGit2 size={19} /> Build my portfolio <ArrowRight size={18} />
            </Link>
            <Link
              href="/demo"
              className="h-12 px-7 rounded-xl border border-zinc-300 dark:border-white/15 font-semibold inline-flex items-center justify-center gap-2 text-base hover:bg-black/5 dark:hover:bg-white/10"
            >
              <Zap size={18} /> Try live demo — no login
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            {username ? (
              <>Signed in as <b>@{username}</b> — head to your dashboard.</>
            ) : (
              <>No credit card · Works with public repos · Free Gemini flash model</>
            )}
          </p>
        </section>

        {username && (
          <section className="mx-auto max-w-6xl px-5 pb-4">
            <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-600/10 via-fuchsia-500/10 to-transparent p-8 sm:p-10 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500">New · Resume Builder</p>
                <h2 className="text-2xl sm:text-3xl font-black mt-1">Welcome back, @{username} — make your resume.</h2>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-xl">
                  Jake&apos;s-resume format with your links, education, experience and the top 3 GitHub
                  projects auto-matched to the role you&apos;re applying for — plus an ATS score check.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Link
                  href="/resume"
                  className="h-12 px-7 rounded-xl bg-black text-white dark:bg-white dark:text-black font-semibold inline-flex items-center justify-center gap-2"
                >
                  Build my resume <ArrowRight size={18} />
                </Link>
                <Link
                  href="/dashboard"
                  className="h-12 px-7 rounded-xl border border-zinc-300 dark:border-white/15 font-semibold inline-flex items-center justify-center gap-2 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Steps */}
        <section className="mx-auto max-w-6xl px-5 py-10 grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <FolderGit2 size={20} />,
              title: "1. Connect GitHub",
              body: "OAuth login pulls your public repos, READMEs, languages, stars and activity via Octokit.",
            },
            {
              icon: <Sparkles size={20} />,
              title: "2. Gemini summarizes",
              body: "Each repo gets a plain-English summary, tech tags and a highlight line as structured JSON.",
            },
            {
              icon: <Share2 size={20} />,
              title: "3. Publish & share",
              body: "Review, edit, pin or hide — then publish to /yourname, viewable without login.",
            },
          ].map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-6 text-left"
            >
              <div className="w-10 h-10 rounded-xl grid place-items-center bg-violet-600/15 text-violet-600 dark:text-violet-300 mb-4">
                {s.icon}
              </div>
              <h3 className="font-bold text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-8 grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <PencilLine size={18} />,
              title: "Review & edit",
              body: "Inline-edit every AI blurb, regenerate per-repo, and only call the LLM when you ask or the repo changed.",
            },
            {
              icon: <Star size={18} />,
              title: "Auto-highlight top work",
              body: "Ranking by stars, recency and complexity surfaces your best projects first. Pin what matters.",
            },
            {
              icon: <ShieldCheck size={18} />,
              title: "Cached, safe, fast",
              body: "Summaries persist in Postgres. Malformed LLM output never breaks the UI — clean fallback instead.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl p-6 bg-gradient-to-b from-zinc-100 to-transparent dark:from-white/5 dark:to-transparent border border-zinc-200 dark:border-white/10">
              <div className="flex items-center gap-2 font-bold">{f.icon} {f.title}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{f.body}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-5 py-10">
          <div className="rounded-3xl bg-gradient-to-br from-violet-700 via-fuchsia-600 to-orange-500 p-10 sm:p-14 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-black">Your GitHub deserves better than a repo list.</h2>
            <p className="mt-3 text-white/85 max-w-xl mx-auto">Generate your portfolio in ~60 seconds. Edit the words, keep the credit.</p>
            <div className="mt-6 flex justify-center gap-3 flex-col sm:flex-row">
              <Link href="/dashboard" className="h-12 px-7 rounded-xl bg-white text-black font-bold inline-flex items-center justify-center gap-2">
                <FolderGit2 size={18} /> Start now
              </Link>
              <Link href="/demo" className="h-12 px-7 rounded-xl border border-white/40 font-bold inline-flex items-center justify-center">
                See demo portfolio
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
