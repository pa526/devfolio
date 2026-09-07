import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AiPortfolioEntry {
  summary: string;
  tags: string[];
  highlight: string;
}

const SYSTEM_PROMPT = `You are analyzing a GitHub repository to write a portfolio entry for a developer.
Given the repo name, description, README content, and primary language, return ONLY valid JSON with this exact shape:
{ "summary": "1-2 sentence plain-English description of what this project does", "tags": ["tech1", "tech2", ...], "highlight": "one sentence on what makes this project notable or technically interesting" }
Do not include markdown formatting or any text outside the JSON object.
If the README is missing or too sparse to summarize confidently, infer conservatively from the repo name, description, and language only.`;

function heuristicFallback(input: {
  name: string;
  description?: string | null;
  language?: string | null;
}): AiPortfolioEntry {
  const { name, description, language } = input;
  const pretty = name.replace(/[-_]/g, " ");
  const summary = description?.trim()
    ? description.trim().slice(0, 220)
    : `${pretty} — a ${language ?? "software"} project built by the developer.`;
  const tags = [language, "GitHub", "Open Source"].filter(Boolean) as string[];
  return {
    summary,
    tags: [...new Set(tags)].slice(0, 6),
    highlight: `Showcases hands-on experience with ${language ?? "modern tooling"} in a real, shipped codebase.`,
  };
}

function extractJson(text: string): AiPortfolioEntry | null {
  try {
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return null;
    const obj = JSON.parse(cleaned.slice(start, end + 1));
    if (typeof obj.summary !== "string") return null;
    return {
      summary: obj.summary.slice(0, 500),
      tags: Array.isArray(obj.tags)
        ? obj.tags.filter((t: unknown) => typeof t === "string").slice(0, 8)
        : [],
      highlight:
        typeof obj.highlight === "string"
          ? obj.highlight.slice(0, 300)
          : "A solid, real-world project worth a closer look.",
    };
  } catch {
    return null;
  }
}

export async function generateRepoSummary(input: {
  name: string;
  description?: string | null;
  readme?: string | null;
  language?: string | null;
}): Promise<AiPortfolioEntry> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return heuristicFallback(input);

  const userContent = [
    `Repo name: ${input.name}`,
    `Description: ${input.description ?? "(none)"}`,
    `Primary language: ${input.language ?? "(unknown)"}`,
    `README (truncated to ~6000 chars):`,
    (input.readme ?? "(no README)").slice(0, 6000),
  ].join("\n");

  // Try configured model first, then fall back through known-good model names.
  // (Model availability varies by key/region/date — this keeps the app working.)
  const candidates = [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ].filter(Boolean) as string[];

  let lastErr: unknown = null;
  for (const modelName of [...new Set(candidates)]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${userContent}`);
      const text = result.response.text();
      const parsed = extractJson(text);
      if (parsed) return parsed;
      return heuristicFallback(input);
    } catch (err) {
      lastErr = err;
      console.error(`Gemini model ${modelName} failed, trying next:`, (err as Error)?.message ?? err);
    }
  }
  console.error("All Gemini models failed, using fallback:", lastErr);
  return heuristicFallback(input);
}

const SUMMARY_PROMPT = `You write resume professional summaries. Given a developer's target role, skills, projects and experience, write a concise 2-3 line professional summary in first person without pronouns (classic resume style, e.g. "Frontend Developer with 3 years of experience building..."). Plain text only, no markdown, no bullet points, max 400 characters. Mention the role, strongest stack, and one concrete proof point if available.`;

/** Shared model rotation (names change over time; first success wins). */
function modelCandidates(): string[] {
  return [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ].filter(Boolean) as string[];
}

export interface ResumeSummaryInput {
  targetRole?: string;
  skills?: string[];
  projects?: { name: string; tech: string; bullets: string[] }[];
  experience?: { title: string; company: string; bullets: string[] }[];
}

/** AI-written professional summary for the resume builder. Falls back to a template. */
export async function generateResumeSummary(input: ResumeSummaryInput): Promise<{ summary: string; ai: boolean }> {
  const skillStr = (input.skills ?? []).filter(Boolean).join(", ");
  const namedProjects = (input.projects ?? []).filter((p) => p.name);
  const projStr = namedProjects
    .slice(0, 3)
    .map((p) => `- ${p.name} (${p.tech}): ${p.bullets.slice(0, 2).join("; ")}`)
    .join("\n");
  const expStr = (input.experience ?? [])
    .filter((e) => e.title)
    .slice(0, 2)
    .map((e) => `- ${e.title} at ${e.company}: ${e.bullets.slice(0, 2).join("; ")}`)
    .join("\n");

  const fallback =
    `${input.targetRole || "Software Developer"} skilled in ${skillStr || "modern web technologies"}` +
    (namedProjects.length ? `, with hands-on project work including ${namedProjects.slice(0, 2).map((p) => p.name).join(" and ")}` : "") +
    `. Focused on shipping clean, maintainable code and measurable results.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { summary: fallback.slice(0, 400), ai: false };

  const content = `${SUMMARY_PROMPT}\n\nTarget role: ${input.targetRole || "(not specified)"}\nSkills: ${skillStr || "(none listed)"}\nProjects:\n${projStr || "(none)"}\nExperience:\n${expStr || "(none)"}`;
  for (const modelName of [...new Set(modelCandidates())]) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(content);
      const text = result.response.text().replace(/[*_#`]/g, "").trim().slice(0, 400);
      if (text.length >= 30) return { summary: text, ai: true };
    } catch (err) {
      console.error(`Summary model ${modelName} failed:`, (err as Error)?.message ?? err);
    }
  }
  return { summary: fallback.slice(0, 400), ai: false };
}
