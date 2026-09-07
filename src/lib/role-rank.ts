import type { PortfolioRepo } from "@/lib/portfolio";

export interface RoleRank {
  name: string;
  relevance: number;
  bullet: string;
}

const ROLE_PROMPT = `You are a hiring assistant helping a developer tailor their resume for a specific role.
Given the target role, key requirements, and a list of GitHub repositories, score how relevant each repo is to the role.
Return ONLY a valid JSON array with one object per repo, in this exact shape:
[{ "name": "repo-name", "relevance": 0-10, "bullet": "one resume-style bullet tying this repo to the role, or empty string if irrelevant" }]
Score 8-10 for direct matches (required tech/role keywords), 4-7 for transferable skills, 0-3 for unrelated.
No markdown, no text outside the JSON array.`;

function extractArray(text: string): RoleRank[] | null {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return null;
    const arr = JSON.parse(cleaned.slice(start, end + 1));
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((o) => o && typeof o.name === "string")
      .map((o) => ({
        name: o.name,
        relevance: Math.max(0, Math.min(10, Number(o.relevance) || 0)),
        bullet: typeof o.bullet === "string" ? o.bullet.slice(0, 280) : "",
      }));
  } catch {
    return null;
  }
}

/**
 * Ask Gemini to rank repos against a role. Returns null when no key is set
 * or the call fails, so callers can fall back to keyword scoring.
 */
export async function rankReposForRole(
  repos: PortfolioRepo[],
  role: string,
  requirements: string
): Promise<RoleRank[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const repoList = repos
    .map(
      (r) =>
        `- ${r.name} (language: ${r.language ?? "unknown"}): ${r.description ?? "no description"}${
          r.aiTags.length ? ` [tags: ${r.aiTags.join(", ")}]` : ""
        }`
    )
    .join("\n");

  const content = `${ROLE_PROMPT}\n\nTarget role: ${role}\nKey requirements:\n${requirements.slice(0, 3000)}\n\nRepositories:\n${repoList}`;

  const candidates = [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter(Boolean) as string[];

  for (const modelName of [...new Set(candidates)]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(content);
      const parsed = extractArray(result.response.text());
      if (parsed && parsed.length) return parsed;
    } catch (err) {
      console.error(`Role-rank model ${modelName} failed:`, (err as Error)?.message ?? err);
    }
  }
  return null;
}
