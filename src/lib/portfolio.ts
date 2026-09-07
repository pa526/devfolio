import { db, dbReady } from "@/lib/db";
import { fetchPublicRepos } from "@/lib/github";
import { parseTags } from "@/lib/utils";

export interface PortfolioRepo {
  name: string;
  description?: string | null;
  language?: string | null;
  stars: number;
  forks?: number;
  url?: string | null;
  aiSummary?: string | null;
  aiTags: string[];
  aiHighlight?: string | null;
  isPinned?: boolean;
  /** Set when the resume is tailored to a role (Gemini-written relevance bullet). */
  tailoredBullet?: string;
}

export interface PortfolioData {
  name: string;
  username: string;
  avatarUrl?: string | null;
  bio?: string | null;
  githubUrl: string;
  repos: PortfolioRepo[];
  skills: string[];
  totalStars: number;
  isCurated: boolean;
}

/** DB (published) first, live GitHub fallback — shared by page, resume preview & PDF. */
export async function getPortfolioData(username: string): Promise<PortfolioData | null> {
  const slug = username.toLowerCase();

  let dbUser: any = null;
  if (await dbReady()) {
    try {
      dbUser = await db.user.findFirst({
        where: { OR: [{ publishedSlug: slug }, { username }] },
        include: { repos: { orderBy: [{ isPinned: "desc" }, { stars: "desc" }] } },
      });
    } catch {
      dbUser = null;
    }
  }

  if (dbUser?.isPublished) {
    const repos: PortfolioRepo[] = dbUser.repos
      .filter((r: any) => !r.isHidden)
      .map((r: any) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stars ?? 0,
        forks: r.forks ?? 0,
        url: r.url,
        aiSummary: r.aiSummary,
        aiTags: parseTags(r.aiTags),
        aiHighlight: r.aiHighlight,
        isPinned: r.isPinned,
      }));
    const skills = [...new Set(repos.flatMap((r) => [r.language, ...r.aiTags]).filter(Boolean))] as string[];
    return {
      name: dbUser.name ?? `@${dbUser.username}`,
      username: dbUser.username,
      avatarUrl: dbUser.avatarUrl,
      bio: dbUser.bio,
      githubUrl: `https://github.com/${dbUser.username}`,
      repos,
      skills: skills.slice(0, 18),
      totalStars: repos.reduce((s, r) => s + r.stars, 0),
      isCurated: true,
    };
  }

  try {
    const { profile, repos: live } = await fetchPublicRepos(username, { withReadme: false });
    const repos: PortfolioRepo[] = live.slice(0, 12).map((r: any) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stars ?? 0,
      forks: r.forks ?? 0,
      url: r.url,
      aiSummary: null,
      aiTags: [],
      aiHighlight: null,
    }));
    const skills = [...new Set(repos.map((r) => r.language).filter(Boolean))] as string[];
    return {
      name: profile?.name ?? `@${profile?.login ?? username}`,
      username: profile?.login ?? username,
      avatarUrl: profile?.avatar_url,
      bio: profile?.bio,
      githubUrl: profile?.html_url ?? `https://github.com/${username}`,
      repos,
      skills: skills.slice(0, 18),
      totalStars: repos.reduce((s, r) => s + r.stars, 0),
      isCurated: false,
    };
  } catch {
    return null;
  }
}
