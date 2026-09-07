"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import {
  FolderGit2, Sparkles, RefreshCw, Pin, EyeOff, Eye, Pencil, Save, X,
  Share2, Loader2, Star, GitFork, Search, Check,
} from "lucide-react";
import { Navbar, Footer } from "@/components/chrome";
import { Button, Card, Badge, Input, Textarea, Skeleton } from "@/components/ui";
import { parseTags } from "@/lib/utils";

interface Repo {
  id: string;
  githubRepoId: string;
  name: string;
  fullName?: string;
  description?: string | null;
  language?: string | null;
  stars: number;
  forks?: number;
  url?: string;
  lastUpdated?: string | null;
  aiSummary?: string | null;
  aiTags: string;
  aiHighlight?: string | null;
  isPinned: boolean;
  isHidden: boolean;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const username = (session as any)?.username as string | undefined;
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ summary: "", highlight: "", tags: "" });
  const [published, setPublished] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const authed = status === "authenticated";

  async function loadRepos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/repos");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load repos");
      setRepos(data.repos ?? []);
      if (data.repos?.length === 0) setError(null);
    } catch (e: any) {
      if (e.message?.includes("Database")) setDbMissing(true);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authed) loadRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function generateOne(id: string, force = false) {
    setGenerating((g) => ({ ...g, [id]: true }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoId: id, force }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const updated = data.repo;
      setRepos((rs) => rs.map((r) => (r.id === id ? updated : r)));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating((g) => ({ ...g, [id]: false }));
    }
  }

  async function generateAll() {
    setGeneratingAll(true);
    setError(null);
    // Stream: generate sequentially so UI updates progressively
    const pending = repos.filter((r) => !r.aiSummary);
    const list = pending.length ? pending : repos;
    for (const r of list) {
      await generateOne(r.id, false);
    }
    setGeneratingAll(false);
  }

  async function patchRepo(id: string, patch: Partial<Repo> & { aiTagsArr?: string[] }) {
    const { aiTagsArr, ...rest } = patch;
    const res = await fetch("/api/repo", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        ...rest,
        ...(aiTagsArr ? { aiTags: aiTagsArr } : {}),
      }),
    });
    const data = await res.json();
    if (res.ok && data.repo) {
      setRepos((rs) => rs.map((r) => (r.id === id ? data.repo : r)));
    }
  }

  function startEdit(r: Repo) {
    setEditing(r.id);
    setEditForm({
      summary: r.aiSummary ?? "",
      highlight: r.aiHighlight ?? "",
      tags: parseTags(r.aiTags).join(", "),
    });
  }

  async function saveEdit(id: string) {
    await patchRepo(id, {
      aiSummary: editForm.summary,
      aiHighlight: editForm.highlight,
      aiTagsArr: editForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    setEditing(null);
  }

  async function togglePublish(next: boolean) {
    const res = await fetch("/api/portfolio/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: next }),
    });
    const data = await res.json();
    if (res.ok) setPublished(data.isPublished);
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const list = repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.language ?? "").toLowerCase().includes(q)
    );
    return [...list].sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) || b.stars - a.stars
    );
  }, [repos, query]);

  const doneCount = repos.filter((r) => r.aiSummary).length;

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-16 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-48" /><Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div>
        <Navbar />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center">
          <div className="rounded-3xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/60 p-10">
            <FolderGit2 size={40} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black">Sign in to build your portfolio</h1>
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              We pull your public repos via GitHub OAuth, then Gemini writes
              summaries for each one. No repos are made public without your approval.
            </p>
            <Button className="mt-6" size="lg" onClick={() => signIn("github", { callbackUrl: "/dashboard" })}>
              <FolderGit2 size={18} /> Sign in with GitHub
            </Button>
            <p className="mt-4 text-sm text-zinc-500">
              No OAuth app configured yet?{" "}
              <Link href="/demo" className="underline font-medium">Try the live demo</Link> instead.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div>
      <Navbar username={username} />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Your repositories</h1>
            <p className="text-sm text-zinc-500 mt-1">
              @{username} · {repos.length} repos · {doneCount} summarized ·{" "}
              <button onClick={() => signOut()} className="underline">Sign out</button>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={loadRepos} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              Sync repos
            </Button>
            <Button size="sm" onClick={generateAll} disabled={generatingAll || repos.length === 0}>
              {generatingAll ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {generatingAll ? "Generating…" : `Generate all (${repos.length - doneCount} left)`}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => togglePublish(!published)}>
              <Share2 size={16} /> {published ? "Unpublish" : "Publish"}
            </Button>
            {username && (
              <Link href="/resume">
                <Button variant="outline" size="sm">📄 Resume Builder</Button>
              </Link>
            )}
            {published && username && (
              <Link href={`/${username}`} target="_blank">
                <Button variant="outline" size="sm">View live →</Button>
              </Link>
            )}
          </div>
        </div>

        {dbMissing && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Database not connected. Run <code className="font-mono">npx prisma migrate dev</code> with{" "}
            <code className="font-mono">DATABASE_URL</code> set, then re-sync.
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm flex justify-between gap-3">
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        <div className="mt-6 flex items-center gap-2 max-w-md">
          <Search size={16} className="text-zinc-500" />
          <Input placeholder="Filter by name, language…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>

        {loading ? (
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-56" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="mt-6 p-10 text-center">
            <p className="font-bold text-lg">No repositories yet</p>
            <p className="text-sm text-zinc-500 mt-2">Click “Sync repos” to pull from GitHub via Octokit.</p>
          </Card>
        ) : (
          <div className="mt-6 grid sm:grid-cols-2 gap-4">
            {filtered.map((r) => {
              const tags = parseTags(r.aiTags);
              const isGen = generating[r.id];
              const isEditing = editing === r.id;
              return (
                <Card key={r.id} className={`p-5 flex flex-col gap-3 ${r.isHidden ? "opacity-60" : ""} ${r.isPinned ? "ring-2 ring-violet-500/60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{r.name}</h3>
                        {r.isPinned && <Badge>📌 Pinned</Badge>}
                        {r.isHidden && <Badge>Hidden</Badge>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1"><Star size={12} /> {r.stars}</span>
                        {r.language && <span>{r.language}</span>}
                        {r.url && <a href={r.url} target="_blank" className="underline">GitHub ↗</a>}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button title="Pin" onClick={() => patchRepo(r.id, { isPinned: !r.isPinned })} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                        <Pin size={15} className={r.isPinned ? "text-violet-500" : ""} />
                      </button>
                      <button title="Hide" onClick={() => patchRepo(r.id, { isHidden: !r.isHidden })} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10">
                        {r.isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
                      </button>
                    </div>
                  </div>

                  {isGen ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <p className="text-xs text-violet-500 inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Gemini is writing…</p>
                    </div>
                  ) : r.aiSummary ? (
                    isEditing ? (
                      <div className="space-y-2">
                        <Textarea value={editForm.summary} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} />
                        <Textarea value={editForm.highlight} onChange={(e) => setEditForm({ ...editForm, highlight: e.target.value })} />
                        <Input value={editForm.tags} onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })} placeholder="tags, comma, separated" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveEdit(r.id)}><Save size={14} /> Save</Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm leading-relaxed">{r.aiSummary}</p>
                        {r.aiHighlight && (
                          <p className="text-sm text-violet-700 dark:text-violet-300 bg-violet-500/10 rounded-xl px-3 py-2">✨ {r.aiHighlight}</p>
                        )}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {tags.map((t) => <Badge key={t}>{t}</Badge>)}
                          </div>
                        )}
                      </>
                    )
                  ) : (
                    <p className="text-sm text-zinc-500">{r.description ?? "No AI summary yet — generate one."}</p>
                  )}

                  {!isEditing && (
                    <div className="mt-auto flex gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => generateOne(r.id, true)} disabled={isGen}>
                        <RefreshCw size={14} /> {r.aiSummary ? "Regenerate" : "Generate"}
                      </Button>
                      {r.aiSummary && (
                        <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                          <Pencil size={14} /> Edit
                        </Button>
                      )}
                      {r.aiSummary && !isGen && (
                        <span className="ml-auto inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Check size={13} /> cached</span>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
