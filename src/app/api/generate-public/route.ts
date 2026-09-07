import { NextRequest, NextResponse } from "next/server";
import { generateRepoSummary } from "@/lib/gemini";
import { fetchReadme } from "@/lib/github";

/**
 * POST /api/generate-public (no auth — demo mode)
 * Body: { owner, name, description?, language? }
 * Fetches README live, calls Gemini, returns { summary, tags, highlight }.
 */
export async function POST(req: NextRequest) {
  try {
    const { owner, name, description, language } = await req.json();
    if (!owner || !name) {
      return NextResponse.json({ error: "owner and name required" }, { status: 400 });
    }
    const readme = await fetchReadme(owner, name);
    const entry = await generateRepoSummary({ name, description, readme, language });
    return NextResponse.json(entry);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Generation failed" }, { status: 500 });
  }
}
