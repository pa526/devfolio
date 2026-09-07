import { NextRequest, NextResponse } from "next/server";
import { renderJakePdf } from "@/lib/resume-jake";
import type { BuilderResume } from "@/lib/builder";

/** POST /api/resume/build — body is a BuilderResume JSON, returns Jake-style PDF. */
export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as BuilderResume;
    if (!data || !data.fullName?.trim()) {
      return NextResponse.json({ error: "fullName is required" }, { status: 400 });
    }
    const pdf = await renderJakePdf({
      ...data,
      education: data.education ?? [],
      experience: data.experience ?? [],
      projects: data.projects ?? [],
      achievements: data.achievements ?? [],
      skillGroups: data.skillGroups ?? [],
      customSections: data.customSections ?? [],
    });
    const slug = data.fullName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return new NextResponse(pdf as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${slug}.pdf"`,
        "Content-Length": String(pdf.length),
      },
    });
  } catch (e: any) {
    console.error("Jake PDF render failed:", e);
    return NextResponse.json({ error: "Could not generate PDF" }, { status: 500 });
  }
}
