"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, GitFork, Sparkles, Loader2, ExternalLink, ArrowLeft } from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Button, Card, Badge, Skeleton } from "@/components/ui";

interface DemoRepo {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  stars: number;
  forks: number;
  url: string;
  ai?: { summary: string; tags: string[]; highlight: string } | null;
  loading?: boolean;
}

export default function DemoUserPage({ params }: { params: { username: string } }) {
  const { username } = params;
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<DemoRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/repos?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setProfile(data.profile);
        setRepos((data.repos ?? []).map((r: any) => ({ ...r, ai: null })));
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  async function generateOne(r: DemoRepo): Promise<DemoRepo> {
    setRepos((rs) => rs.map((x) => (x.id === r.id ? { ...x, loading: true } : x)));
    try {
      const res = await fetch("/api/generate-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: username,
          name: r.name,
          description: r.description,
          language: r.language,
        }),
      });
      const ai = await res.json();
      const updated = { ...r, ai, loading: false };
      setRepos((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
      return updated;
    } catch {
      const updated = { ...r, loading: false };
      setRepos((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
      return updated;
    }
  }

  async function generateAll() {
    setGeneratingAll(true);
    for (const r of repos) {
      if (!r.ai) await generateOne(r);
    }
    setGeneratingAll(false);
  }

  const skills = [...new Set(repos.flatMap((r) => [r.language, ...(r.ai?.tags ?? [])]).filter(Boolean))].slice(0, 16);

  return (
    <div>
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <Link href="/demo" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
          <ArrowLeft size={14} /> try another username
        </Link>

        {loading ? (
          <div className="mt-6 space-y-4">
            <div className="flex gap-4 items-center"><Skeleton className="h-20 w-20 rounded-full" /><Skeleton className="h-8 w-64" /></div>
            <div className="grid sm:grid-cols-2 gap-4"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
          </div>
        ) : error ? (
          <Card className="mt-6 p-10 text-center">
            <p className="font-bold text-lg">Couldn’t load “{username}”</p>
            <p className="text-sm text-zinc-500 mt-2">{error}</p>
          </Card>
        ) : (
          <>
            <div className="mt-6 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={profile?.avatar_url} alt={username} className="w-20 h-20 rounded-full border" />
              <div className="flex-1">
                <h1 className="text-3xl font-black">@{username}</h1>
                <p className="text-zinc-500 text-sm mt-1">{profile?.bio ?? "Demo portfolio — summaries generated live with Gemini."}</p>
                <div className="mt-2 flex gap-3 text-xs text-zinc-500">
                  <span>{profile?.public_repos} repos</span>
                  <span>{profile?.followers} followers</span>
                  <a className="underline" href={profile?.html_url} target="_blank">GitHub ↗</a>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
              <Button onClick={generateAll} disabled={generatingAll}>
                {generatingAll ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {generatingAll ? "Generating…" : "✨ Summarize all with Gemini"}
              </Button>
              </div>
            </div>

            {skills.length > 0 && (
              <div className="mt-6">
                <h2 className="font-bold mb-2">Skills (auto-aggregated)</h2>
                <div className="flex flex-wrap gap-1.5">{skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
              </div>
            )}

            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              {repos.map((r) => (
                <Card key={r.id} className="p-5 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold">{r.name}</h3>
                    <a href={r.url} target="_blank" className="text-zinc-500 hover:text-black dark:hover:text-white"><ExternalLink size={15} /></a>
                  </div>
                  <div className="flex gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1"><Star size={12} /> {r.stars}</span>
                    <span className="inline-flex items-center gap-1"><GitFork size={12} /> {r.forks}</span>
                    {r.language && <span>{r.language}</span>}
                  </div>
                  {r.loading ? (
                    <div className="space-y-2 mt-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
                  ) : r.ai ? (
                    <>
                      <p className="text-sm">{r.ai.summary}</p>
                      <p className="text-sm text-violet-700 dark:text-violet-300 bg-violet-500/10 rounded-xl px-3 py-2">✨ {r.ai.highlight}</p>
                      <div className="flex flex-wrap gap-1.5">{r.ai.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-zinc-500">{r.description ?? "No description."}</p>
                      <Button size="sm" variant="outline" className="mt-1 self-start" onClick={() => generateOne(r)}>
                        <Sparkles size={14} /> Generate summary
                      </Button>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
