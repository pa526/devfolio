import type { PortfolioRepo } from "@/lib/portfolio";
import { rankReposForRole } from "@/lib/role-rank";

export interface ScoredRepo extends PortfolioRepo {
  score: number;
  tailoredBullet?: string;
}

export interface TailorOptions {
  role?: string;
  requirements?: string;
  count?: number;
}

const STOPWORDS = new Set(
  "and the for with you will our are has have from that this with years year experience plus including include including ability work team teams strong knowledge using use used based looking join help make build developing develop developed development role candidate ideal bonus nice familiar exposure opportunity opportunities etc also must should shall can will would their there them they our your applicant applicants job responsibilities requirements required preferred qualifications plus".split(" ")
);

/** Extra keywords implied by common role titles, so "Frontend Developer" matches React repos etc. */
const ROLE_SYNONYMS: Record<string, string[]> = {
  frontend: ["react", "vue", "angular", "svelte", "javascript", "typescript", "html", "css", "nextjs", "next", "tailwind", "ui", "ux", "redux", "vite", "webpack"],
  backend: ["node", "express", "django", "flask", "spring", "java", "go", "rust", "postgres", "mysql", "mongodb", "redis", "api", "rest", "graphql", "microservice", "server"],
  fullstack: ["react", "node", "nextjs", "typescript", "javascript", "postgres", "api", "full", "stack", "mern"],
  mobile: ["flutter", "dart", "react-native", "swift", "kotlin", "android", "ios", "expo"],
  devops: ["docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ci", "cd", "jenkins", "github-actions", "linux", "nginx", "pipeline"],
  data: ["python", "pandas", "numpy", "sql", "spark", "airflow", "etl", "dashboard", "visualization", "postgres", "analysis"],
  ml: ["python", "tensorflow", "pytorch", "scikit", "machine-learning", "deep-learning", "nlp", "llm", "ai", "model", "training", "inference"],
  ai: ["python", "llm", "openai", "langchain", "rag", "embedding", "nlp", "pytorch", "tensorflow", "agent"],
};

export function tokenize(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .split(" ")
    .map((t) => t.trim().replace(/^[#.]+|[#.]+$/g, ""))
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
  const out = new Set(raw);
  for (const t of raw) {
    for (const [role, syns] of Object.entries(ROLE_SYNONYMS)) {
      if (t.includes(role)) syns.forEach((s) => out.add(s));
    }
  }
  return [...out];
}

function haystack(r: PortfolioRepo): { name: string; desc: string; lang: string; tags: string } {
  return {
    name: r.name.toLowerCase().replace(/[-_]/g, " "),
    desc: (r.description ?? "").toLowerCase(),
    lang: (r.language ?? "").toLowerCase(),
    tags: r.aiTags.join(" ").toLowerCase(),
  };
}

export function keywordScore(repo: PortfolioRepo, tokens: string[]): number {
  if (!tokens.length) return 0;
  const h = haystack(repo);
  let score = 0;
  for (const t of tokens) {
    if (h.lang === t || (t.length > 3 && h.lang.includes(t))) score += 5;
    if (h.tags.includes(t)) score += 3;
    if (h.name.includes(t)) score += 2;
    if (h.desc.includes(t)) score += 1.5;
  }
  return score;
}

/**
 * Shortlist repos for a target role. Tries Gemini ranking first (works when a
 * valid GEMINI_API_KEY is set), otherwise keyword scoring. Never throws.
 */
export async function tailorRepos(
  repos: PortfolioRepo[],
  opts: TailorOptions
): Promise<{ repos: ScoredRepo[]; tailored: boolean; matched: boolean }> {
  const count = Math.max(1, Math.min(12, opts.count ?? 6));
  const base: ScoredRepo[] = [...repos]
    .sort((a, b) => Number(b.isPinned ?? false) - Number(a.isPinned ?? false) || b.stars - a.stars)
    .map((r) => ({ ...r, score: 0 }));

  const role = (opts.role ?? "").trim();
  const requirements = (opts.requirements ?? "").trim();
  if (!role && !requirements) {
    return { repos: base.slice(0, Math.max(count, 8)), tailored: false, matched: false };
  }

  // 1) Gemini ranking
  try {
    const ranks = await rankReposForRole(repos, role || "Software Developer", requirements || role);
    if (ranks && ranks.length) {
      const byName = new Map(ranks.map((r) => [r.name.toLowerCase(), r]));
      const scored: ScoredRepo[] = repos.map((r) => {
        const rank = byName.get(r.name.toLowerCase());
        return {
          ...r,
          score: rank?.relevance ?? 0,
          tailoredBullet: rank && rank.relevance >= 4 && rank.bullet ? rank.bullet : undefined,
        };
      });
      scored.sort((a, b) => b.score - a.score || b.stars - a.stars);
      const matched = scored.some((r) => r.score >= 4);
      return { repos: scored.slice(0, count), tailored: true, matched };
    }
  } catch (e) {
    console.error("Gemini role ranking failed, using keyword fallback:", e);
  }

  // 2) Keyword fallback
  const tokens = tokenize(`${role}\n${requirements}`);
  const scored: ScoredRepo[] = repos.map((r) => ({ ...r, score: keywordScore(r, tokens) }));
  scored.sort((a, b) => b.score - a.score || b.stars - a.stars);
  const matched = scored.some((r) => r.score > 0);
  return { repos: scored.slice(0, count), tailored: true, matched };
}
