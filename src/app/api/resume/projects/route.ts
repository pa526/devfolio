import { NextResponse } from "next/server";
import { getPortfolioData } from "@/lib/portfolio";
import { tailorRepos } from "@/lib/matcher";

/** Tags that add zero information on a resume. */
const JUNK_TAGS = new Set(["github", "open source", "git", "repository", "code"]);

/** Filler lines from generation fallbacks — never put these on a resume. */
const FILLER_PATTERNS = [/showcases hands-on experience/i, /edit manually/i];

const isFiller = (t: string) => FILLER_PATTERNS.some((p) => p.test(t));

function cleanTech(language: string | null | undefined, tags: string[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [language ?? "", ...tags]) {
    const tag = t.trim();
    const key = tag.toLowerCase();
    if (!tag || key.length < 2 || JUNK_TAGS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out.slice(0, 8).join(", ");
}

/**
 * GET /api/resume/projects?username=&role=&requirements=
 * Returns the top 3 repos best suited to the role, shaped for the builder.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const username = url.searchParams.get("username")?.trim();
  const role = url.searchParams.get("role") ?? undefined;
  const requirements = url.searchParams.get("requirements") ?? undefined;
  if (!username) return NextResponse.json({ error: "username is required" }, { status: 400 });

  const data = await getPortfolioData(username);
  if (!data || data.repos.length === 0) {
    return NextResponse.json({ error: "No repos found for this GitHub user" }, { status: 404 });
  }
  const { repos, matched } = await tailorRepos(data.repos, { role, requirements, count: 3 });
  return NextResponse.json({
    matched,
    projects: repos.map((r) => {
      const summary = r.tailoredBullet || r.aiSummary || r.description || "";
      const highlight = r.aiHighlight || "";
      return {
        name: r.name,
        tech: cleanTech(r.language, r.aiTags),
        link: r.url ?? "",
        summary: isFiller(summary) ? "" : summary,
        highlight: isFiller(highlight) ? "" : highlight,
        stars: r.stars,
      };
    }),
  });
}
