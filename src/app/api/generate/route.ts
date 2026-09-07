import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, dbReady } from "@/lib/db";
import { generateRepoSummary } from "@/lib/gemini";
import { stringifyTags } from "@/lib/utils";

/**
 * POST /api/generate
 * Body: { repoId?: string, all?: boolean, force?: boolean }
 * - Single: generates for one repo (cached unless force or repo changed)
 * - All: batch generates for every repo missing a summary
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { repoId, all, force } = body as { repoId?: string; all?: boolean; force?: boolean };

  if (!(await dbReady())) {
    return NextResponse.json({ error: "Database not configured. Run: npx prisma migrate dev" }, { status: 503 });
  }

  const username = (session as any)?.username as string | undefined;
  const user = username
    ? await db.user.findUnique({ where: { username } })
    : null;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  async function generateOne(repo: any) {
    // Cache: skip if fresh summary exists and not forced
    if (!force && repo.aiSummary && repo.summaryUpdatedAt) {
      const stale =
        repo.lastUpdated &&
        new Date(repo.lastUpdated).getTime() > new Date(repo.summaryUpdatedAt).getTime();
      if (!stale) return { repo, cached: true };
    }
    const entry = await generateRepoSummary({
      name: repo.name,
      description: repo.description,
      readme: repo.readmeRaw,
      language: repo.language,
    }).catch(() => ({
      summary: "Unable to generate summary — edit manually.",
      tags: repo.language ? [repo.language] : [],
      highlight: "Edit this highlight to describe what makes the project notable.",
    }));

    const updated = await db.repo.update({
      where: { id: repo.id },
      data: {
        aiSummary: entry.summary,
        aiTags: stringifyTags(entry.tags),
        aiHighlight: entry.highlight,
        summaryUpdatedAt: new Date(),
      },
    });
    return { repo: updated, cached: false };
  }

  try {
    if (all) {
      const repos = await db.repo.findMany({ where: { userId: user.id } });
      const results = [];
      for (const r of repos) {
        if (!force && r.aiSummary) {
          results.push({ id: r.id, cached: true, repo: r });
          continue;
        }
        const out = await generateOne(r);
        results.push({ id: r.id, ...out });
      }
      return NextResponse.json({ results, count: results.length });
    }

    if (!repoId) return NextResponse.json({ error: "repoId required" }, { status: 400 });
    const repo = await db.repo.findFirst({ where: { id: repoId, userId: user.id } });
    if (!repo) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    const out = await generateOne(repo);
    return NextResponse.json(out);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message ?? "Generation failed" }, { status: 500 });
  }
}
