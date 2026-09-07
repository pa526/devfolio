import { NextRequest, NextResponse } from "next/server";
import { generateResumeSummary } from "@/lib/gemini";

/**
 * POST /api/resume/summary — { targetRole, skills[], projects[], experience[] }
 * Returns an AI-written professional summary (template fallback if AI fails).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const out = await generateResumeSummary({
      targetRole: body.targetRole ?? "",
      skills: Array.isArray(body.skills) ? body.skills : [],
      projects: Array.isArray(body.projects) ? body.projects : [],
      experience: Array.isArray(body.experience) ? body.experience : [],
    });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Summary generation failed" }, { status: 500 });
  }
}
