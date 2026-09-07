import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, GitFork, ExternalLink, FolderGit2 } from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Card, Badge } from "@/components/ui";
import { db, dbReady } from "@/lib/db";
import { fetchPublicRepos } from "@/lib/github";
import { parseTags } from "@/lib/utils";

export const revalidate = 120;

export default async function PublicPortfolio({ params }: { params: { username: string } }) {
  const slug = params.username.toLowerCase();

  // 1) Try DB (published portfolio)
  let dbUser: any = null;
  if (await dbReady()) {
    try {
      dbUser = await db.user.findFirst({
        where: { OR: [{ publishedSlug: slug }, { username: params.username }] },
        include: { repos: { orderBy: [{ isPinned: "desc" }, { stars: "desc" }] } },
      });
    } catch {
      dbUser = null;
    }
  }

  // 2) Fallback: live GitHub (works even without DB / publish)
  let live: { profile: any; repos: any[] } | null = null;
  if (!dbUser || !dbUser.isPublished) {
    try {
      const data = await fetchPublicRepos(params.username, { withReadme: false });
      live = { profile: data.profile, repos: data.repos };
    } catch {
      if (!dbUser) return notFound();
    }
  }

  const isDb = !!dbUser?.isPublished;
  const profile = isDb
    ? {
        login: dbUser.username,
        avatar_url: dbUser.avatarUrl,
        bio: dbUser.bio,
        html_url: `https://github.com/${dbUser.username}`,
      }
    : live!.profile;

  const repos = isDb
    ? dbUser.repos.filter((r: any) => !r.isHidden)
    : live!.repos.slice(0, 12).map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stars,
        forks: r.forks,
        url: r.url,
        aiSummary: null,
        aiTags: "[]",
        aiHighlight: null,
      }));

  const skills = [
    ...new Set(
      repos.flatMap((r: any) => [r.language, ...parseTags(r.aiTags)]).filter(Boolean)
    ),
  ].slice(0, 18) as string[];

  const totalStars = repos.reduce((s: number, r: any) => s + (r.stars ?? 0), 0);

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-8 sm:p-10 flex flex-col sm:flex-row gap-6 items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt={profile.login} className="w-24 h-24 rounded-2xl border" />
          )}
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-violet-500">DevFolio portfolio</p>
            <h1 className="text-4xl font-black mt-1">{dbUser?.name ?? `@${profile?.login}`}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400 max-w-2xl">
              {profile?.bio ?? "Developer portfolio generated from GitHub with AI summaries."}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-500">
              <span><b className="text-black dark:text-white">{repos.length}</b> projects</span>
              <span><b className="text-black dark:text-white">{totalStars}</b> total stars</span>
              <a href={profile?.html_url} target="_blank" className="inline-flex items-center gap-1 underline">
                <FolderGit2 size={14} /> GitHub ↗
              </a>
            </div>
            {!isDb && (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Live preview from GitHub (owner hasn’t published curated AI summaries yet).
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/" className="text-xs px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black font-semibold text-center">
              Make yours →
            </Link>
          </div>
        </div>

        {skills.length > 0 && (
          <section className="mt-8">
            <h2 className="font-bold text-lg mb-2">Skills</h2>
            <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-bold text-lg mb-3">Projects</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {repos.map((r: any) => (
              <Card key={r.id ?? r.name} className="p-5 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold">{r.name}</h3>
                  {r.url && <a href={r.url} target="_blank"><ExternalLink size={15} className="text-zinc-500" /></a>}
                </div>
                <div className="flex gap-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1"><Star size={12} /> {r.stars ?? 0}</span>
                  {!!r.forks && <span className="inline-flex items-center gap-1"><GitFork size={12} /> {r.forks}</span>}
                  {r.language && <span>{r.language}</span>}
                </div>
                {r.aiSummary ? (
                  <>
                    <p className="text-sm">{r.aiSummary}</p>
                    {r.aiHighlight && (
                      <p className="text-sm text-violet-700 dark:text-violet-300 bg-violet-500/10 rounded-xl px-3 py-2">✨ {r.aiHighlight}</p>
                    )}
                    {parseTags(r.aiTags).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {parseTags(r.aiTags).map((t) => <Badge key={t}>{t}</Badge>)}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">{r.description ?? "No description yet."}</p>
                )}
              </Card>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
