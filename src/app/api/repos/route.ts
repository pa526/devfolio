import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Octokit } from "@octokit/rest";
import { db, dbReady } from "@/lib/db";

/**
 * GET /api/repos
 * - Authenticated: fetch via Octokit with OAuth token, upsert into DB
 * - ?username=xxx (demo, no auth): fetch public repos via REST, no DB write required
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const demoUsername = searchParams.get("username");

  // Demo / public mode — no login required
  if (demoUsername) {
    try {
      const perPage = 30;
      const userRes = await fetch(`https://api.github.com/users/${demoUsername}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (userRes.status === 404)
        return NextResponse.json({ error: "GitHub user not found" }, { status: 404 });
      const profile = await userRes.json();
      const repoRes = await fetch(
        `https://api.github.com/users/${demoUsername}/repos?per_page=${perPage}&sort=updated&type=owner`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      const raw = await repoRes.json();
      const repos = (Array.isArray(raw) ? raw : [])
        .filter((r: any) => !r.fork)
        .slice(0, 24)
        .map((r: any) => ({
          id: `demo-${r.id}`,
          githubRepoId: String(r.id),
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count ?? 0,
          forks: r.forks_count ?? 0,
          url: r.html_url,
          lastUpdated: r.updated_at,
          aiSummary: null,
          aiTags: "[]",
          aiHighlight: null,
          isPinned: false,
          isHidden: false,
        }))
        .sort((a: any, b: any) => b.stars - a.stars);
      return NextResponse.json({ profile, repos, mode: "demo" });
    } catch (e: any) {
      return NextResponse.json({ error: e.message ?? "Fetch failed" }, { status: 500 });
    }
  }

  // Authenticated mode
  const session = await getServerSession(authOptions);
  const token = (session as any)?.accessToken as string | undefined;
  const username = (session as any)?.username as string | undefined;
  if (!session || !token || !username) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.repos.listForAuthenticatedUser({
      per_page: 50,
      sort: "updated",
      affiliation: "owner",
    });

    const filtered = data.filter((r: any) => !r.fork).slice(0, 40);

    // Fetch READMEs for top 15 (to keep it fast)
    const withReadme = await Promise.all(
      filtered.map(async (r: any, i: number) => {
        let readmeRaw: string | null = null;
        if (i < 15) {
          try {
            const { data: rd } = await octokit.repos.getReadme({
              owner: r.owner.login,
              repo: r.name,
            });
            const content = (rd as any).content as string | undefined;
            if (content) {
              readmeRaw = Buffer.from(content, "base64").toString("utf-8").slice(0, 8000);
            }
          } catch {
            readmeRaw = null;
          }
        }
        return { r, readmeRaw };
      })
    );

    let persisted: any[] = [];
    if (await dbReady()) {
      const user = await db.user.upsert({
        where: { githubId: String((session as any).githubId ?? username) },
        update: { username, accessToken: token },
        create: {
          githubId: String((session as any).githubId ?? username),
          username,
          accessToken: token,
          publishedSlug: username.toLowerCase(),
        },
      });
      persisted = await Promise.all(
        withReadme.map(({ r, readmeRaw }) =>
          db.repo.upsert({
            where: {
              userId_githubRepoId: { userId: user.id, githubRepoId: String(r.id) },
            },
            update: {
              name: r.name,
              fullName: r.full_name,
              description: r.description,
              language: r.language,
              stars: r.stargazers_count ?? 0,
              forks: r.forks_count ?? 0,
              url: r.html_url,
              lastUpdated: r.updated_at ? new Date(r.updated_at) : null,
              ...(readmeRaw ? { readmeRaw } : {}),
            },
            create: {
              userId: user.id,
              githubRepoId: String(r.id),
              name: r.name,
              fullName: r.full_name,
              description: r.description,
              language: r.language,
              stars: r.stargazers_count ?? 0,
              forks: r.forks_count ?? 0,
              url: r.html_url,
              lastUpdated: r.updated_at ? new Date(r.updated_at) : null,
              readmeRaw,
            },
          })
        )
      );
    } else {
      persisted = withReadme.map(({ r, readmeRaw }) => ({
        id: `mem-${r.id}`,
        githubRepoId: String(r.id),
        name: r.name,
        fullName: r.full_name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count ?? 0,
        forks: r.forks_count ?? 0,
        url: r.html_url,
        lastUpdated: r.updated_at,
        readmeRaw,
        aiSummary: null,
        aiTags: "[]",
        aiHighlight: null,
        isPinned: false,
        isHidden: false,
      }));
    }

    return NextResponse.json({ repos: persisted, mode: "auth", count: persisted.length });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e.message ?? "Failed to fetch repos" },
      { status: 500 }
    );
  }
}
